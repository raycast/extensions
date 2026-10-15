import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, parse } from "node:path";
import {
  ExportFormat,
  Settings,
  VideoRef,
  cleanSrt,
  executable,
  isCanceled,
  localFileInfo,
  outputDirectory,
  rawCaptionText,
  run,
  safeName,
  uniquePath,
  runYtDlp,
  vttToText,
  whisperLanguageName,
} from "./core";
import {
  catalogEncoder,
  downloadEncoder,
  modelCatalog,
  modelsFolder,
} from "./models";

/** Whether a WAV header already describes the 16 kHz mono 16-bit PCM audio whisper.cpp reads. */
export function isWhisperWavHeader(header: Buffer): boolean {
  if (
    header.length < 12 ||
    header.toString("ascii", 0, 4) !== "RIFF" ||
    header.toString("ascii", 8, 12) !== "WAVE"
  )
    return false;
  for (let offset = 12; offset + 8 <= header.length;) {
    const size = header.readUInt32LE(offset + 4);
    if (header.toString("ascii", offset, offset + 4) === "fmt ")
      return (
        offset + 24 <= header.length &&
        header.readUInt16LE(offset + 8) === 1 &&
        header.readUInt16LE(offset + 10) === 1 &&
        header.readUInt32LE(offset + 12) === 16000 &&
        header.readUInt16LE(offset + 22) === 16
      );
    offset += 8 + size + (size % 2);
  }
  return false;
}

async function isWhisperWav(path: string): Promise<boolean> {
  const file = await open(path, "r");
  try {
    const header = Buffer.alloc(4096);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    return isWhisperWavHeader(header.subarray(0, bytesRead));
  } finally {
    await file.close();
  }
}

export type WhisperSetup = { whisper: string; model: string; vad?: string };

/** Silero VAD v6.2.0 converted for whisper.cpp, from the ggml-org Hugging Face repository. */
export const sileroModel = {
  name: "ggml-silero-v6.2.0.bin",
  url: "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin",
  sha256: "2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987",
};

async function readable(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The Silero VAD model: the one set in preferences, one next to the whisper
 * model, or a copy downloaded once into the extension's support folder.
 */
async function vadModel(
  settings: Settings,
  model: string,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (settings.vadModelPath) {
    if (await readable(settings.vadModelPath)) return settings.vadModelPath;
    throw new Error(
      "The Silero VAD model was not found. Select it again in extension preferences.",
    );
  }
  const beside = join(dirname(model), sileroModel.name);
  if (await readable(beside)) return beside;
  if (!settings.supportPath)
    throw new Error("Select a Silero VAD model in extension preferences.");
  const folder = join(settings.supportPath, "models");
  const downloaded = join(folder, sileroModel.name);
  if (await readable(downloaded)) return downloaded;
  onProgress?.("Downloading Silero VAD model…");
  let data: Buffer;
  try {
    const response = await fetch(sileroModel.url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      `Could not download the Silero VAD model (${error instanceof Error ? error.message : String(error)}). Check your connection, or turn off Voice Activity Detection in extension preferences.`,
    );
  }
  if (createHash("sha256").update(data).digest("hex") !== sileroModel.sha256)
    throw new Error(
      "The downloaded Silero VAD model was damaged. Try again later.",
    );
  await mkdir(folder, { recursive: true });
  const partial = `${downloaded}.${process.pid}.part`;
  await writeFile(partial, data);
  await rename(partial, downloaded);
  return downloaded;
}

export type WhisperModel = {
  path: string;
  /** The file name without `ggml-` and `.bin`, for example `large-v3-turbo-q5_0`. */
  name: string;
  size: number;
  /** The Core ML encoder this model still needs, when whisper.cpp was built with Core ML. */
  missingEncoder?: string;
  /** The size of that encoder when it can be downloaded, which happens before the first transcription. */
  encoderSize?: number;
};

export function modelName(path: string): string {
  return basename(path)
    .replace(/^ggml-/, "")
    .replace(/\.bin$/, "");
}

/** The models folder of a whisper.cpp checkout, from its `build/bin/whisper-cli`. */
function checkoutModels(whisper: string): string {
  return join(dirname(dirname(dirname(whisper))), "models");
}

function defaultModelFile(settings: Settings): string | undefined {
  return settings.supportPath
    ? join(settings.supportPath, "default-model.txt")
    : undefined;
}

/** The model chosen with Set as Default Model, if it still exists. */
function savedDefaultModel(settings: Settings): string | undefined {
  const file = defaultModelFile(settings);
  try {
    const path = file && readFileSync(file, "utf8").trim();
    return path && existsSync(path) ? path : undefined;
  } catch {
    return undefined;
  }
}

/** Makes a model the default, unless the Default Whisper Model preference is set. */
export function saveDefaultModel(settings: Settings, path: string) {
  const file = defaultModelFile(settings);
  if (!file)
    throw new Error("The extension's support folder is not available.");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, path);
}

/** The Core ML encoder whisper.cpp loads for a model; quantized models share their base model's encoder. */
export function coreMlEncoder(model: string): string {
  return `${model.replace(/\.[^./]*$/, "").replace(/-q\d_\d$/, "")}-encoder.mlmodelc`;
}

/** Whether whisper-cli was built with Core ML, which needs an encoder next to every model. */
export function usesCoreMl(whisper: string): boolean {
  try {
    const bin = dirname(realpathSync(whisper));
    return [join(bin, "..", "src"), join(bin, "..", "lib"), bin].some(
      (folder) => existsSync(join(folder, "libwhisper.coreml.dylib")),
    );
  } catch {
    return false;
  }
}

/** How suitable a model is as the default: the catalog's order, with large-v3-turbo first. */
function defaultRank(name: string): number {
  const index = modelCatalog.findIndex((model) => model.name === name);
  return index < 0 ? modelCatalog.length : index;
}

/**
 * Installed whisper models: the Default Whisper Model preference and the
 * models next to it, the whisper.cpp checkout's models, and models downloaded
 * in Manage Tools and Models. The default model is the preference, then the
 * one chosen with Set as Default Model, then the best installed model. It
 * comes first, then larger (more accurate) models before smaller ones.
 */
export async function whisperModels(settings: Settings): Promise<{
  models: WhisperModel[];
  defaultModel?: string;
  coreMl: boolean;
}> {
  let whisper: string | undefined;
  try {
    whisper = await executable(settings.whisperPath, "whisper-cli");
  } catch {
    whisper = undefined;
  }
  const coreMl = whisper ? usesCoreMl(whisper) : false;
  const saved = savedDefaultModel(settings);
  const folders = [
    ...(settings.modelPath ? [dirname(settings.modelPath)] : []),
    ...(saved ? [dirname(saved)] : []),
    ...(whisper ? [checkoutModels(whisper)] : []),
    ...(settings.supportPath ? [modelsFolder(settings.supportPath)] : []),
  ];
  const paths = new Set<string>();
  if (settings.modelPath && localFileInfo(settings.modelPath)?.isFile)
    paths.add(settings.modelPath);
  for (const folder of new Set(folders)) {
    try {
      for (const file of await readdir(folder))
        if (/^ggml-.+\.bin$/i.test(file) && !/silero/i.test(file))
          paths.add(join(folder, file));
    } catch {
      /* missing folder */
    }
  }
  const models: WhisperModel[] = [];
  for (const path of paths) {
    const info = localFileInfo(path);
    if (!info?.isFile) continue;
    const encoder = coreMlEncoder(path);
    const missing = coreMl && !existsSync(encoder);
    models.push({
      path,
      name: modelName(path),
      size: info.size,
      missingEncoder: missing ? basename(encoder) : undefined,
      encoderSize: missing ? catalogEncoder(modelName(path))?.size : undefined,
    });
  }
  const defaultModel =
    (settings.modelPath && paths.has(settings.modelPath)
      ? settings.modelPath
      : undefined) ??
    (saved && paths.has(saved) ? saved : undefined) ??
    [...models].sort(
      (a, b) => defaultRank(a.name) - defaultRank(b.name) || b.size - a.size,
    )[0]?.path;
  models.sort(
    (a, b) =>
      Number(b.path === defaultModel) - Number(a.path === defaultModel) ||
      b.size - a.size,
  );
  return { models, defaultModel, coreMl };
}

async function whisperSetup(
  settings: Settings,
  chosenModel?: string,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<WhisperSetup> {
  const whisper = await executable(settings.whisperPath, "whisper-cli");
  const model = chosenModel || (await whisperModels(settings)).defaultModel;
  if (!model)
    throw new Error(
      "No whisper model is installed. Download one in Manage Tools and Models.",
    );
  if (!(await readable(model)))
    throw new Error(
      `${basename(model)} was not found. Choose another model, or download one in Manage Tools and Models.`,
    );
  if (usesCoreMl(whisper) && !existsSync(coreMlEncoder(model))) {
    if (!catalogEncoder(modelName(model)))
      throw new Error(
        `This whisper.cpp build uses Core ML, and ${modelName(model)} has no Core ML encoder (${basename(coreMlEncoder(model))}). Choose another model.`,
      );
    await downloadEncoder(model, onProgress, signal);
  }
  return {
    whisper,
    model,
    vad:
      settings.skipSilence === false
        ? undefined
        : await vadModel(settings, model, onProgress, signal),
  };
}

/**
 * Returns a 16 kHz mono 16-bit WAV for whisper.cpp. Audio that is already in
 * that format is used as is; anything else is converted with ffmpeg, reading
 * only the first audio track.
 */
async function whisperAudio(
  input: string,
  temporary: string,
  settings: Settings,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (await isWhisperWav(input)) return input;
  const ffmpeg = await executable(settings.ffmpegPath, "ffmpeg");
  const wav = join(temporary, "audio.wav");
  onProgress?.("Converting audio to 16 kHz WAV…");
  try {
    await run(
      ffmpeg,
      [
        "-nostdin",
        "-loglevel",
        "error",
        "-y",
        "-i",
        input,
        "-map",
        "0:a:0",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        wav,
      ],
      undefined,
      signal,
    );
  } catch (error) {
    if (error instanceof Error && /matches no streams/.test(error.message))
      throw new Error("This file has no audio track.");
    throw error;
  }
  return wav;
}

/** Runs whisper-cli and returns the path the outputs were written to, without extension. */
async function runWhisper(
  { whisper, model, vad }: WhisperSetup,
  wav: string,
  {
    language,
    translate,
    vadSpeechPadMs,
  }: Pick<TranscriptionOptions, "language" | "translate" | "vadSpeechPadMs">,
  outputs: string[],
  temporary: string,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
  runner: typeof run = run,
): Promise<string> {
  const result = join(temporary, "result");
  onProgress?.(
    `${translate ? "Translating" : "Transcribing"} with ${modelName(model)}…`,
  );
  try {
    await runner(
      whisper,
      [
        "-m",
        model,
        "-f",
        wav,
        "-l",
        language,
        ...(translate ? ["--translate"] : []),
        ...(vad ? ["--vad", "--vad-model", vad] : []),
        ...(vad && vadSpeechPadMs
          ? ["--vad-speech-pad-ms", String(vadSpeechPadMs)]
          : []),
        "--print-progress",
        ...outputs.map((extension) => `--output-${extension}`),
        "-of",
        result,
      ],
      (line) => {
        const match = /progress\s*=\s*(\d+)%/.exec(line);
        if (match)
          onProgress?.(
            `${translate ? "Translating" : "Transcribing"}… ${match[1]}%`,
          );
      },
      signal,
    );
  } catch (error) {
    const coreMl =
      error instanceof Error &&
      /failed to load Core ML model from '([^']+)'/.exec(error.message);
    if (coreMl)
      throw new Error(
        `whisper.cpp couldn't load the Core ML encoder for ${modelName(model)} (${basename(coreMl[1])}). Move it to the Trash and try again to download it again, or choose another model.`,
      );
    if (
      vad &&
      error instanceof Error &&
      /unknown argument: --vad|failed to (initialize|open|compute) VAD/i.test(
        error.message,
      )
    )
      throw new Error(
        "whisper.cpp couldn't run Silero VAD. Update whisper.cpp, or turn off Voice Activity Detection in extension preferences.",
      );
    throw error;
  }
  return result;
}

export type TranscriptionOptions = {
  /** A whisper.cpp language code, or `auto`. */
  language: string;
  format: ExportFormat;
  /** The model file; the default model when not set. */
  model?: string;
  /** Translate the speech to English instead of transcribing it. */
  translate?: boolean;
  /** Extra speech kept around Silero VAD segments, for short recordings such as dictation. */
  vadSpeechPadMs?: number;
};

/** Turns whisper.cpp's line-per-segment TXT output into text suitable for inserting at a cursor. */
export function cleanWhisperText(output: string): string {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Turbo models were not trained to translate and answer in the spoken language instead. */
export function canTranslate(model: string): boolean {
  return !/turbo/i.test(modelName(model));
}

/** The end of a transcription's file name, for example `whisper-Serbian` or `whisper-Serbian to English`. */
export function transcriptSuffix(language: string, translate?: boolean) {
  const spoken =
    language === "auto" ? "auto" : safeName(whisperLanguageName(language));
  return `whisper-${spoken}${translate && language !== "en" ? " to English" : ""}`;
}

/** Finds whisper.cpp, the model and the VAD model, and checks the model can do what was asked. */
async function prepare(
  options: TranscriptionOptions,
  settings: Settings,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<WhisperSetup> {
  const setup = await whisperSetup(settings, options.model, onProgress, signal);
  if (options.translate && !canTranslate(setup.model))
    throw new Error(
      `${modelName(setup.model)} can't translate. Choose large-v3 or another model without “turbo” in its name.`,
    );
  return setup;
}

/** Resolves the whisper.cpp executable, model, encoder and VAD used for short text transcription. */
export async function prepareWhisperForText(
  options: Pick<TranscriptionOptions, "language" | "model" | "vadSpeechPadMs">,
  settings: Settings,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<WhisperSetup> {
  return prepare({ ...options, format: "txt" }, settings, onProgress, signal);
}

/**
 * Transcribes one recording with whisper.cpp and saves one file in the chosen
 * format, named after `name` in `directory`.
 */
async function transcribeInto(
  setup: WhisperSetup,
  input: string,
  temporary: string,
  { directory, name }: { directory: string; name: string },
  options: TranscriptionOptions,
  settings: Settings,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { language, format, translate } = options;
  const wav = await whisperAudio(
    input,
    temporary,
    settings,
    onProgress,
    signal,
  );
  const source = format === "srt" ? "srt" : "vtt";
  const result = await runWhisper(
    setup,
    wav,
    options,
    [source],
    temporary,
    onProgress,
    signal,
  );
  const output = await readFile(`${result}.${source}`, "utf8");
  if (!rawCaptionText(output, source).trim())
    throw new Error(
      setup.vad
        ? "No speech was found. The recording may be only music or silence."
        : "No speech was found.",
    );
  const target = await uniquePath(
    directory,
    `${name} - ${transcriptSuffix(language, translate)}${format === "raw" ? " - RAW" : ""}`,
    format === "raw" ? "txt" : format,
  );
  await writeFile(
    target,
    format === "raw"
      ? rawCaptionText(output, "vtt")
      : format === "txt"
        ? vttToText(output)
        : format === "srt"
          ? cleanSrt(output)
          : output,
    { encoding: "utf8", flag: "wx" },
  );
  return target;
}

/**
 * Transcribes a local audio or video file and saves the result next to it, or
 * in the download folder when that folder is not writable.
 */
export async function transcribeFile(
  path: string,
  options: TranscriptionOptions,
  settings: Settings,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!localFileInfo(path)?.isFile)
    throw new Error(`${path} is not a file that can be read.`);
  const setup = await prepare(options, settings, onProgress, signal);
  let directory = dirname(path);
  try {
    await access(directory, constants.W_OK);
  } catch {
    directory = await outputDirectory(settings);
  }
  const temporary = await mkdtemp(join(tmpdir(), "raycast-whisper-"));
  try {
    return await transcribeInto(
      setup,
      path,
      temporary,
      { directory, name: safeName(parse(path).name) },
      options,
      settings,
      onProgress,
      signal,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

/** Transcribes one short recording and returns clean text without saving a transcript. */
export async function transcribeToText(
  path: string,
  options: Pick<TranscriptionOptions, "language" | "model" | "vadSpeechPadMs">,
  settings: Settings,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const setup = await prepareWhisperForText(
    options,
    settings,
    onProgress,
    signal,
  );
  return transcribePreparedToText(
    path,
    options,
    setup,
    settings,
    onProgress,
    signal,
  );
}

/** Transcribes short audio with an already-resolved whisper.cpp setup. */
export async function transcribePreparedToText(
  path: string,
  options: Pick<TranscriptionOptions, "language" | "model" | "vadSpeechPadMs">,
  setup: WhisperSetup,
  settings: Settings,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
  runner: typeof run = run,
): Promise<string> {
  if (!localFileInfo(path)?.isFile)
    throw new Error(`${path} is not a file that can be read.`);
  const transcription = { ...options, format: "txt" as const };
  const temporary = await mkdtemp(join(tmpdir(), "raycast-dictation-"));
  try {
    const wav = await whisperAudio(
      path,
      temporary,
      settings,
      onProgress,
      signal,
    );
    const result = await runWhisper(
      setup,
      wav,
      transcription,
      ["txt"],
      temporary,
      onProgress,
      signal,
      runner,
    );
    const text = cleanWhisperText(await readFile(`${result}.txt`, "utf8"));
    if (!text)
      throw new Error(
        setup.vad
          ? "No speech was found. The recording may be only music or silence."
          : "No speech was found.",
      );
    return text;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

/**
 * Downloads a video's audio with yt-dlp, transcribes it, and saves the result
 * in the download folder. Posts with several videos, such as X posts and
 * Instagram carousels, get one transcript per video; videos that fail are
 * skipped when others succeed.
 */
export async function transcribeVideo(
  video: VideoRef,
  options: TranscriptionOptions,
  settings: Settings,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<{
  outputs: string[];
  skipped: { title: string; reason: string }[];
}> {
  const directory = await outputDirectory(settings);
  const setup = await prepare(options, settings, onProgress, signal);
  const temporary = await mkdtemp(join(tmpdir(), "raycast-whisper-"));
  const outputs: string[] = [];
  const skipped: { title: string; reason: string }[] = [];
  try {
    onProgress?.("Downloading audio…");
    let item = "";
    let failure: unknown;
    try {
      await runYtDlp(
        settings,
        [
          "--no-playlist",
          "--newline",
          // A photo in a carousel shouldn't stop the videos around it.
          ...(video.items || video.photos ? ["--ignore-errors"] : []),
          "-f",
          "bestaudio/best",
          "-o",
          join(temporary, "audio-%(playlist_index|0)s.%(ext)s"),
          video.url,
        ],
        (line) => {
          const next = /^\[download\] Downloading item (\d+) of (\d+)/.exec(
            line,
          );
          if (next) item = `${next[1]} of ${next[2]} · `;
          const match = /\[download\]\s+([\d.]+)%/.exec(line);
          if (match)
            onProgress?.(
              `${item}Downloading audio… ${Math.floor(Number(match[1]))}%`,
            );
        },
        signal,
      );
    } catch (error) {
      if (isCanceled(error)) throw error;
      failure = error;
    }
    const files = (await readdir(temporary))
      .filter(
        (name) => name.startsWith("audio-") && !/\.(part|ytdl)$/.test(name),
      )
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!files.length)
      throw failure ?? new Error("yt-dlp did not produce an audio file.");
    const stem = `${safeName(video.title)} [${video.id}]`;
    for (const [index, file] of files.entries()) {
      const several = files.length > 1;
      const work = join(temporary, `work-${index}`);
      await mkdir(work);
      try {
        outputs.push(
          await transcribeInto(
            setup,
            join(temporary, file),
            work,
            { directory, name: several ? `${stem} ${index + 1}` : stem },
            options,
            settings,
            (message) =>
              onProgress?.(
                several
                  ? `${index + 1} of ${files.length} · ${message}`
                  : message,
              ),
            signal,
          ),
        );
      } catch (error) {
        if (isCanceled(error) || !several) throw error;
        skipped.push({
          title: `Video ${index + 1}`,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (!outputs.length) throw new Error(skipped[0].reason);
    return { outputs, skipped };
  } catch (error) {
    // Canceling keeps the transcripts saved so far, for the queue to show.
    if (isCanceled(error))
      Object.assign(error as Error, { partial: { outputs, skipped } });
    throw error;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
