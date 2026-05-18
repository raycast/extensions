import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { spawn as spawnProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  notFoundMessage,
  resolveKeshaBin,
  type KeshaSpawn,
} from "./lib/kesha-bin";

const execFileAsync = promisify(execFile);
const DEFAULT_MAX_SECONDS = 120;
const MAX_ALLOWED_SECONDS = 3600;

interface TranscribeResult {
  file: string;
  text: string;
  lang: string;
  audioLanguage?: { code: string; confidence: number };
  textLanguage?: { code: string; confidence: number };
  sttTimeMs?: number;
}

type State =
  | { status: "starting" }
  | { status: "recording"; maxSeconds: number }
  | { status: "stopping" }
  | { status: "transcribing" }
  | { status: "error"; message: string; hint?: string }
  | { status: "ok"; result: TranscribeResult; rawJson: string };

export default function Command() {
  const prefs = getPreferenceValues<Preferences.DictateToClipboard>();
  const [state, setState] = useState<State>({ status: "starting" });
  const recorderRef = useRef<ReturnType<typeof spawnProcess> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let tempDir: string | null = null;

    async function runDictation() {
      try {
        const maxSeconds = parseMaxSeconds(prefs.maxRecordingSeconds);
        const kesha = await resolveKeshaBin(prefs.keshaBinPath);
        if (!kesha) {
          setState({
            status: "error",
            message: "kesha CLI not found.",
            hint: notFoundMessage(),
          });
          return;
        }

        tempDir = await mkdtemp(join(tmpdir(), "raycast-kesha-dictate-"));
        const audioPath = join(tempDir, "dictation.wav");

        setState({ status: "recording", maxSeconds });
        await showToast({
          style: Toast.Style.Animated,
          title: "Recording",
          message: `Stops automatically after ${maxSeconds}s`,
        });

        await recordAudio(kesha, audioPath, maxSeconds, recorderRef);
        if (cancelled) return;

        setState({ status: "transcribing" });
        await showToast({
          style: Toast.Style.Animated,
          title: "Transcribing",
          message: basename(audioPath),
        });

        const { result, rawJson } = await transcribeAudio(kesha, audioPath);
        if (cancelled) return;

        const transcript = result.text.trim();
        if (!transcript) {
          throw new Error("No speech was detected in the recording.");
        }
        await Clipboard.copy(transcript);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied transcript",
        });
        setState({
          status: "ok",
          result: { ...result, text: transcript },
          rawJson,
        });
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        await showToast({
          style: Toast.Style.Failure,
          title: "Dictation failed",
        });
        setState({ status: "error", message });
      } finally {
        recorderRef.current = null;
        if (tempDir) {
          await rm(tempDir, { recursive: true, force: true });
        }
      }
    }

    void runDictation();
    return () => {
      cancelled = true;
      stopRecorder(recorderRef.current);
    };
  }, []);

  if (state.status === "starting") {
    return <Detail isLoading markdown="Preparing microphone..." />;
  }

  if (state.status === "recording") {
    return (
      <Detail
        markdown={`# Recording\n\nSpeak now. Recording stops automatically after ${state.maxSeconds} seconds.`}
        actions={
          <ActionPanel>
            <Action
              title="Stop and Transcribe"
              onAction={() => {
                setState({ status: "stopping" });
                stopRecorder(recorderRef.current);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state.status === "stopping") {
    return <Detail isLoading markdown="Stopping recording..." />;
  }

  if (state.status === "transcribing") {
    return <Detail isLoading markdown="Transcribing..." />;
  }

  if (state.status === "error") {
    const body = state.hint
      ? `${state.message}\n\n${state.hint}`
      : state.message;
    return <Detail markdown={`# Error\n\n${body}`} />;
  }

  const { result, rawJson } = state;
  return (
    <Detail
      markdown={buildMarkdown(result)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Transcript"
            content={result.text}
          />
          <Action.CopyToClipboard title="Copy as JSON" content={rawJson} />
        </ActionPanel>
      }
    />
  );
}

function parseMaxSeconds(value: string | undefined): number {
  const raw = value?.trim() || String(DEFAULT_MAX_SECONDS);
  const parsed = Number(raw);
  if (
    !Number.isInteger(parsed) ||
    parsed <= 0 ||
    parsed > MAX_ALLOWED_SECONDS
  ) {
    throw new Error(
      `Max recording seconds must be an integer between 1 and ${MAX_ALLOWED_SECONDS}.`,
    );
  }
  return parsed;
}

function stopRecorder(proc: ReturnType<typeof spawnProcess> | null) {
  if (!proc || proc.killed) return;
  proc.stdin?.end();
}

async function recordAudio(
  kesha: KeshaSpawn,
  audioPath: string,
  maxSeconds: number,
  recorderRef: MutableRefObject<ReturnType<typeof spawnProcess> | null>,
): Promise<void> {
  const proc = spawnProcess(
    kesha.command,
    [
      ...kesha.prefixArgs,
      "record",
      "--out",
      audioPath,
      "--max-seconds",
      String(maxSeconds),
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  recorderRef.current = proc;
  let stderr = "";
  proc.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
    if (stderr.length > 8000) stderr = stderr.slice(-8000);
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    proc.once("error", reject);
    proc.once("exit", (code) => resolve(code));
  });
  recorderRef.current = null;
  if (exitCode !== 0) {
    throw new Error(
      stderr.trim() || `kesha record exited with code ${exitCode}`,
    );
  }
}

async function transcribeAudio(
  kesha: KeshaSpawn,
  audioPath: string,
): Promise<{ result: TranscribeResult; rawJson: string }> {
  const { stdout } = await execFileAsync(
    kesha.command,
    [...kesha.prefixArgs, "--json", audioPath],
    {
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const parsed = JSON.parse(stdout) as TranscribeResult[];
  if (!parsed.length) {
    throw new Error("No transcript returned.");
  }
  return { result: parsed[0], rawJson: stdout };
}

function buildMarkdown(r: TranscribeResult): string {
  const lines: string[] = [];
  lines.push("# Dictation");
  lines.push("");
  lines.push(r.text);
  lines.push("");
  lines.push("---");
  const meta: string[] = [];
  const lang = r.textLanguage?.code ?? r.audioLanguage?.code ?? r.lang;
  const conf = r.textLanguage?.confidence ?? r.audioLanguage?.confidence;
  if (lang) {
    meta.push(
      conf != null
        ? `**Language:** \`${lang}\` (confidence ${conf.toFixed(2)})`
        : `**Language:** \`${lang}\``,
    );
  }
  if (r.sttTimeMs != null) {
    meta.push(`**STT time:** ${r.sttTimeMs} ms`);
  }
  lines.push(meta.join(" · "));
  return lines.join("\n");
}
