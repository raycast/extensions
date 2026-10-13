import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { AzureCredentials, Settings, buildLabel } from "./settings.js";
import { Engine, Job, Word, audioDir, ensureDirs } from "./state.js";
import { concatWav, wavDurationMs } from "./wav.js";

const execFileAsync = promisify(execFile);

/** Azure rejects very long requests; ~3k characters keeps every call comfortably inside the limit. */
const azureChunkChars = 3000;

export const powershell = path.join(
  process.env.SystemRoot ?? "C:\\Windows",
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe",
);

/**
 * Where `reader.ps1` and `synth-sapi.ps1` live. Raycast commands pass
 * `environment.assetsPath`; the background worker passes its own directory, because
 * it is bundled straight into `assets/`.
 */
export const assetPath = (assetsDir: string, file: string) =>
  path.join(assetsDir, file);

const escapeXml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

/** Azure wants a signed percentage: 1.2x becomes "+20%", 0.8x becomes "-20%". */
const toProsodyRate = (rate: number) => {
  const percent = Math.round((rate - 1) * 100);
  return `${percent >= 0 ? "+" : ""}${percent}%`;
};

/** SAPI takes an integer from -10 to 10; a log scale keeps 2.5x reachable at the top. */
const toSapiRate = (rate: number) =>
  Math.max(
    -10,
    Math.min(10, Math.round((10 * Math.log(rate)) / Math.log(2.5))),
  );

/** Break on sentence ends first, then on any whitespace, so no chunk splits a word. */
const chunkText = (
  text: string,
  limit: number,
): { body: string; offset: number }[] => {
  if (text.length <= limit) return [{ body: text, offset: 0 }];
  const chunks: { body: string; offset: number }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    if (text.length - cursor <= limit) {
      chunks.push({ body: text.slice(cursor), offset: cursor });
      break;
    }
    const window = text.slice(cursor, cursor + limit);
    const sentenceEnd = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
      window.lastIndexOf("\n"),
    );
    const cut =
      sentenceEnd > limit * 0.4 ? sentenceEnd + 1 : window.lastIndexOf(" ");
    const end = cursor + (cut > 0 ? cut : limit);
    chunks.push({ body: text.slice(cursor, end), offset: cursor });
    cursor = end;
  }
  return chunks.filter((chunk) => chunk.body.trim().length > 0);
};

/**
 * Azure reports the spoken word but its character offset points into the SSML we sent,
 * not into the original text. Walking a cursor through the text is the reliable anchor.
 */
const anchorWord = (text: string, cursor: number, word: string) => {
  if (!word) return undefined;
  const direct = text.indexOf(word, cursor);
  if (direct >= 0) return direct;
  const loose = text
    .toLocaleLowerCase()
    .indexOf(word.toLocaleLowerCase(), cursor);
  return loose >= 0 ? loose : undefined;
};

type SynthResult = { wav: string; words: Word[] };

const synthAzureChunk = (
  body: string,
  chunkOffset: number,
  fullText: string,
  settings: Settings,
  credentials: AzureCredentials,
  wav: string,
): Promise<SynthResult> => {
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    credentials.key,
    credentials.region,
  );
  speechConfig.speechSynthesisVoiceName = settings.azureVoice;
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;
  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(wav);
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  const words: Word[] = [];
  let cursor = chunkOffset;
  synthesizer.wordBoundary = (_sender, event) => {
    if (event.boundaryType === sdk.SpeechSynthesisBoundaryType.Punctuation)
      return;
    const pos = anchorWord(fullText, cursor, event.text);
    if (pos === undefined) return;
    cursor = pos + event.text.length;
    words.push({
      ms: Math.round(event.audioOffset / 10000),
      pos,
      len: event.text.length,
    });
  };

  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">` +
    `<voice name="${escapeXml(settings.azureVoice)}">` +
    `<prosody rate="${toProsodyRate(settings.rate)}">${escapeXml(body)}</prosody>` +
    `</voice></speak>`;

  return new Promise<SynthResult>((resolve, reject) => {
    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        synthesizer.close();
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve({ wav, words });
          return;
        }
        if (result.reason === sdk.ResultReason.Canceled) {
          const cancellation = sdk.CancellationDetails.fromResult(result);
          reject(
            new Error(cancellation.errorDetails || String(cancellation.reason)),
          );
          return;
        }
        reject(new Error(result.errorDetails || "Azure returned no audio"));
      },
      // The SDK hands this callback a string, never an Error — wrap it so every
      // rejection from here reaches the HUD with a `.message` to read.
      (error) => {
        synthesizer.close();
        reject(new Error(String(error) || "Azure could not be reached"));
      },
    );
  });
};

const synthWindows = async (
  text: string,
  settings: Settings,
  wav: string,
  assetsDir: string,
): Promise<SynthResult> => {
  const textFile = `${wav}.txt`;
  const mapFile = `${wav}.json`;
  fs.writeFileSync(textFile, text, "utf8");
  await execFileAsync(
    powershell,
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      assetPath(assetsDir, "synth-sapi.ps1"),
      "-TextFile",
      textFile,
      "-WavFile",
      wav,
      "-MapFile",
      mapFile,
      "-Voice",
      settings.windowsVoice,
      "-Rate",
      String(toSapiRate(settings.rate)),
    ],
    { windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
  );
  const words = JSON.parse(fs.readFileSync(mapFile, "utf8")) as Word[];
  fs.rmSync(textFile, { force: true });
  fs.rmSync(mapFile, { force: true });
  return { wav, words };
};

export type BuildJobInput = {
  /** The whole text the reader should display. */
  fullText: string;
  /** Speak from this character onwards. Everything before is drawn as already read. */
  charOffset: number;
  settings: Settings;
  engine: Engine;
  credentials?: AzureCredentials;
  continuation: boolean;
  /** Folder holding the PowerShell helpers. */
  assetsDir: string;
};

export const buildJob = async ({
  fullText,
  charOffset,
  settings,
  engine,
  credentials,
  continuation,
  assetsDir,
}: BuildJobInput): Promise<Job> => {
  ensureDirs();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const finalWav = path.join(audioDir, `${id}.wav`);
  const body = fullText.slice(charOffset);

  let words: Word[];

  if (engine === "azure" && credentials) {
    const chunks = chunkText(body, azureChunkChars);
    const parts: SynthResult[] = [];
    for (const [index, chunk] of chunks.entries()) {
      const partWav =
        chunks.length === 1
          ? finalWav
          : path.join(audioDir, `${id}-${index}.wav`);
      parts.push(
        await synthAzureChunk(
          chunk.body,
          charOffset + chunk.offset,
          fullText,
          settings,
          credentials,
          partWav,
        ),
      );
    }
    if (parts.length === 1) {
      words = parts[0].words;
    } else {
      const offsets = concatWav(
        parts.map((part) => part.wav),
        finalWav,
      );
      words = parts.flatMap((part, index) =>
        part.words.map((word) => ({ ...word, ms: word.ms + offsets[index] })),
      );
      for (const part of parts) fs.rmSync(part.wav, { force: true });
    }
  } else {
    const result = await synthWindows(body, settings, finalWav, assetsDir);
    // SAPI reports offsets inside the text it was given; shift them onto the full text.
    words = result.words.map((word) => ({
      ...word,
      pos: word.pos + charOffset,
    }));
  }

  return {
    id,
    wav: finalWav,
    text: fullText,
    charOffset,
    rate: settings.rate,
    engine,
    label: buildLabel(engine, settings),
    continuation,
    words: words.sort((a, b) => a.ms - b.ms),
  };
};

export const jobDurationMs = (job: Job) => wavDurationMs(job.wav);
