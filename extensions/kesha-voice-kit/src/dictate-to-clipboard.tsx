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
import {
  mkdtemp,
  open as openFile,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  notFoundMessage,
  resolveKeshaBin,
  type KeshaSpawn,
} from "./lib/kesha-bin";

const execFileAsync = promisify(execFile);
const DEFAULT_MAX_SECONDS = 120;
const MAX_ALLOWED_SECONDS = 3600;
const SILENCE_PEAK_THRESHOLD = 0.0001;
const METER_INTERVAL_MS = 500;
const METER_WINDOW_SECONDS = 1;
const WAV_HEADER_BYTES = 4096;
const WAVE_FORMAT_EXTENSIBLE = 0xfffe;
const TRANSCRIBE_TIMEOUT_MS = 15_000;

interface TranscribeResult {
  file: string;
  text: string;
}

interface MicInfo {
  name: string;
  sampleRate?: number;
  channels?: number;
}

interface SignalLevel {
  rms: number;
  peak: number;
  percent: number;
  status: string;
}

type State =
  | { status: "starting" }
  | {
      status: "recording";
      maxSeconds: number;
      elapsedSeconds: number;
      mic: MicInfo;
      signal: SignalLevel;
    }
  | { status: "stopping" }
  | { status: "transcribing" }
  | { status: "error"; message: string; hint?: string }
  | { status: "ok"; result: TranscribeResult };

export default function Command() {
  const prefs = getPreferenceValues<Preferences.DictateToClipboard>();
  const [state, setState] = useState<State>({ status: "starting" });
  const recorderRef = useRef<ReturnType<typeof spawnProcess> | null>(null);
  const transcribeAbortRef = useRef<AbortController | null>(null);

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

        setState({
          status: "recording",
          maxSeconds,
          elapsedSeconds: 0,
          mic: { name: "Default input device" },
          signal: {
            rms: 0,
            peak: 0,
            percent: 0,
            status: "Waiting for microphone audio...",
          },
        });
        const stopMonitoring = startRecordingMonitor(audioPath, setState);
        await showToast({
          style: Toast.Style.Animated,
          title: "Recording",
          message: `Stops automatically after ${maxSeconds}s`,
        });

        try {
          await recordAudio(kesha, audioPath, maxSeconds, recorderRef);
        } finally {
          stopMonitoring();
        }
        if (cancelled) return;

        if (await isSilentWav(audioPath)) {
          throw new Error(
            "Recorded audio is silent. Check macOS Microphone permission for Raycast and the selected input device.",
          );
        }

        setState({ status: "transcribing" });
        await showToast({
          style: Toast.Style.Animated,
          title: "Transcribing",
          message: basename(audioPath),
        });

        const transcribeAbort = new AbortController();
        transcribeAbortRef.current = transcribeAbort;
        const result = await transcribeAudio(
          kesha,
          audioPath,
          transcribeAbort.signal,
        );
        transcribeAbortRef.current = null;
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
        transcribeAbortRef.current = null;
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
      transcribeAbortRef.current?.abort();
    };
  }, []);

  if (state.status === "starting") {
    return <Detail isLoading markdown="Preparing microphone..." />;
  }

  if (state.status === "recording") {
    return (
      <Detail
        markdown={buildRecordingMarkdown(state)}
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

  const { result } = state;
  return (
    <Detail
      markdown={buildMarkdown(result)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Transcript"
            content={result.text}
          />
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

function startRecordingMonitor(
  audioPath: string,
  setState: Dispatch<SetStateAction<State>>,
): () => void {
  const startedAt = Date.now();
  let stopped = false;

  function updateRecording(
    patch: Partial<Extract<State, { status: "recording" }>>,
  ) {
    if (stopped) return;
    setState((current) => {
      if (current.status !== "recording") return current;
      return { ...current, ...patch };
    });
  }

  void resolveDefaultMicInfo().then((mic) => updateRecording({ mic }));

  async function tick() {
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - startedAt) / 1000),
    );
    try {
      const signal = await readWavSignal(audioPath);
      updateRecording({ elapsedSeconds, signal });
    } catch {
      updateRecording({
        elapsedSeconds,
        signal: {
          rms: 0,
          peak: 0,
          percent: 0,
          status: "Waiting for audio file...",
        },
      });
    }
  }

  void tick();
  const timer = setInterval(() => void tick(), METER_INTERVAL_MS);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

async function resolveDefaultMicInfo(): Promise<MicInfo> {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/system_profiler", [
      "SPAudioDataType",
      "-json",
    ]);
    const parsed = JSON.parse(stdout) as { SPAudioDataType?: unknown[] };
    const devices = flattenSystemProfilerItems(parsed.SPAudioDataType);
    const input = devices.find(isDefaultInputDevice);
    if (!input) return { name: "Default input device" };
    return {
      name: stringValue(input._name) || "Default input device",
      sampleRate: numberValue(input.coreaudio_device_srate),
      channels: numberValue(input.coreaudio_device_input),
    };
  } catch {
    return { name: "Default input device" };
  }
}

function flattenSystemProfilerItems(items: unknown): Record<string, unknown>[] {
  if (!Array.isArray(items)) return [];
  const out: Record<string, unknown>[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    out.push(record);
    out.push(...flattenSystemProfilerItems(record._items));
  }
  return out;
}

function isDefaultInputDevice(item: Record<string, unknown>): boolean {
  const marker = item.coreaudio_default_audio_input_device;
  return marker === "spaudio_yes" || marker === "Yes" || marker === true;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

async function readWavSignal(audioPath: string): Promise<SignalLevel> {
  const fileStat = await stat(audioPath);
  if (fileStat.size < 68) {
    return emptySignal("Opening microphone stream...");
  }

  const file = await openFile(audioPath, "r");
  try {
    const headerLength = Math.min(WAV_HEADER_BYTES, fileStat.size);
    const header = Buffer.alloc(headerLength);
    await file.read(header, 0, header.length, 0);
    const fmt = findWavChunk(header, "fmt ");
    const data = findWavChunk(header, "data");
    if (!fmt || !data || fmt.length < 16 || fileStat.size <= data.offset) {
      return emptySignal("Opening microphone stream...");
    }

    const audioFormat = header.readUInt16LE(fmt.offset);
    const formatTag = wavPayloadFormat(header, fmt, audioFormat);
    const bitsPerSample = header.readUInt16LE(fmt.offset + 14);
    const blockAlign = Math.max(1, header.readUInt16LE(fmt.offset + 12));
    const byteRate = Math.max(1, header.readUInt32LE(fmt.offset + 8));
    const availableBytes = fileStat.size - data.offset;
    const windowBytes = alignBytes(
      Math.min(availableBytes, byteRate * METER_WINDOW_SECONDS),
      blockAlign,
    );
    if (windowBytes <= 0) {
      return emptySignal("Listening...");
    }

    const window = Buffer.alloc(windowBytes);
    await file.read(
      window,
      0,
      window.length,
      data.offset + availableBytes - windowBytes,
    );
    const stats = measurePcmWindow(window, formatTag, bitsPerSample);
    if (!stats) {
      return emptySignal("Listening...");
    }
    return {
      ...stats,
      percent: signalPercent(stats),
      status:
        stats.peak > SILENCE_PEAK_THRESHOLD
          ? "Signal detected"
          : "Listening...",
    };
  } finally {
    await file.close();
  }
}

function alignBytes(bytes: number, blockAlign: number): number {
  return bytes - (bytes % blockAlign);
}

function emptySignal(status: string): SignalLevel {
  return { rms: 0, peak: 0, percent: 0, status };
}

function signalPercent(signal: Pick<SignalLevel, "rms" | "peak">): number {
  return Math.min(
    100,
    Math.round(Math.max(Math.sqrt(signal.peak) * 100, signal.rms * 600)),
  );
}

function measurePcmWindow(
  data: Buffer,
  formatTag: number,
  bitsPerSample: number,
): Pick<SignalLevel, "rms" | "peak"> | null {
  let sum = 0;
  let peak = 0;
  let count = 0;

  if (formatTag === 3 && bitsPerSample === 32) {
    for (let offset = 0; offset + 4 <= data.length; offset += 4) {
      const sample = data.readFloatLE(offset);
      if (!Number.isFinite(sample)) continue;
      const abs = Math.abs(sample);
      sum += sample * sample;
      peak = Math.max(peak, abs);
      count += 1;
    }
  } else if (formatTag === 1 && bitsPerSample === 16) {
    for (let offset = 0; offset + 2 <= data.length; offset += 2) {
      const sample = data.readInt16LE(offset) / 32768;
      const abs = Math.abs(sample);
      sum += sample * sample;
      peak = Math.max(peak, abs);
      count += 1;
    }
  } else {
    return null;
  }

  if (count === 0) return null;
  return { rms: Math.sqrt(sum / count), peak };
}

function buildRecordingMarkdown(
  state: Extract<State, { status: "recording" }>,
): string {
  const micDetails = [
    state.mic.sampleRate ? `${state.mic.sampleRate} Hz` : null,
    state.mic.channels
      ? `${state.mic.channels} channel${state.mic.channels === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);
  const meter = renderSignalMeter(state.signal.percent);
  return [
    "# Recording",
    "",
    `**Microphone:** ${state.mic.name}`,
    micDetails.length ? `**Format:** ${micDetails.join(", ")}` : null,
    `**Signal:** ${meter} ${state.signal.percent}%`,
    `**Status:** ${state.signal.status}`,
    `**Elapsed:** ${state.elapsedSeconds}s / ${state.maxSeconds}s`,
    "",
    "Speak now. Recording stops automatically at the max duration.",
  ]
    .filter((line): line is string => line != null)
    .join("\n\n");
}

function renderSignalMeter(percent: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(percent / 10)));
  return `[${"#".repeat(filled)}${"-".repeat(10 - filled)}]`;
}

async function isSilentWav(audioPath: string): Promise<boolean> {
  const wav = await readFile(audioPath);
  const fmt = findWavChunk(wav, "fmt ");
  const data = findWavChunk(wav, "data");
  if (!fmt || !data || fmt.length < 16 || data.length === 0) return false;

  const audioFormat = wav.readUInt16LE(fmt.offset);
  const formatTag = wavPayloadFormat(wav, fmt, audioFormat);
  const bitsPerSample = wav.readUInt16LE(fmt.offset + 14);
  let peak = 0;

  if (formatTag === 3 && bitsPerSample === 32) {
    for (
      let offset = data.offset;
      offset + 4 <= data.offset + data.length;
      offset += 4
    ) {
      peak = Math.max(peak, Math.abs(wav.readFloatLE(offset)));
      if (peak > SILENCE_PEAK_THRESHOLD) return false;
    }
    return true;
  }

  if (formatTag === 1 && bitsPerSample === 16) {
    for (
      let offset = data.offset;
      offset + 2 <= data.offset + data.length;
      offset += 2
    ) {
      peak = Math.max(peak, Math.abs(wav.readInt16LE(offset)) / 32768);
      if (peak > SILENCE_PEAK_THRESHOLD) return false;
    }
    return true;
  }

  return false;
}

function findWavChunk(
  wav: Buffer,
  id: string,
): { offset: number; length: number } | null {
  for (let offset = 12; offset + 8 <= wav.length; ) {
    const length = wav.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (wav.toString("ascii", offset, offset + 4) === id) {
      return { offset: dataOffset, length };
    }
    offset = dataOffset + length + (length % 2);
  }
  return null;
}

function wavPayloadFormat(
  wav: Buffer,
  fmt: { offset: number; length: number },
  audioFormat: number,
): number {
  if (audioFormat !== WAVE_FORMAT_EXTENSIBLE || fmt.length < 40) {
    return audioFormat;
  }
  const subFormatOffset = fmt.offset + 24;
  if (subFormatOffset + 4 > wav.length) {
    return audioFormat;
  }
  return wav.readUInt32LE(subFormatOffset);
}

function stopRecorder(proc: ReturnType<typeof spawnProcess> | null) {
  if (!proc) return;
  if (proc.stdin && !proc.stdin.destroyed) {
    try {
      proc.stdin.end("\n");
    } catch {
      // Fall through to the watchdog below.
    }
  }

  const terminate = setTimeout(() => {
    if (proc.exitCode == null) {
      killRecorderProcess(proc, "SIGTERM");
    }
  }, 1500);
  terminate.unref?.();

  const forceKill = setTimeout(() => {
    if (proc.exitCode == null) {
      killRecorderProcess(proc, "SIGKILL");
    }
  }, 5000);
  forceKill.unref?.();
}

function killRecorderProcess(
  proc: ReturnType<typeof spawnProcess>,
  signal: NodeJS.Signals,
) {
  if (proc.pid) {
    try {
      process.kill(-proc.pid, signal);
      return;
    } catch {
      // Fall back to killing the wrapper if the process group is unavailable.
    }
  }
  proc.kill(signal);
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
    { stdio: ["pipe", "ignore", "pipe"], detached: true },
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
  signal?: AbortSignal,
): Promise<TranscribeResult> {
  const stdout = await runKeshaPlainTranscribe(
    kesha.command,
    [...kesha.prefixArgs, audioPath],
    signal,
  );
  const text = stdout.trim();
  if (!text) {
    throw new Error("No transcript returned.");
  }
  return { file: audioPath, text };
}

async function runKeshaPlainTranscribe(
  command: string,
  args: string[],
  signal?: AbortSignal,
): Promise<string> {
  const proc = spawnProcess(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;
  proc.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf8");
    if (stdout.length > 16 * 1024 * 1024)
      stdout = stdout.slice(-16 * 1024 * 1024);
  });
  proc.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
    if (stderr.length > 8000) stderr = stderr.slice(-8000);
  });

  const timeout = setTimeout(() => {
    timedOut = true;
    killRecorderProcess(proc, "SIGTERM");
  }, TRANSCRIBE_TIMEOUT_MS);
  timeout.unref?.();

  const forceKill = setTimeout(() => {
    if (proc.exitCode == null) {
      killRecorderProcess(proc, "SIGKILL");
    }
  }, TRANSCRIBE_TIMEOUT_MS + 3000);
  forceKill.unref?.();

  const abort = () => killRecorderProcess(proc, "SIGTERM");
  signal?.addEventListener("abort", abort, { once: true });

  try {
    const exitCode = await new Promise<number | null>((resolve, reject) => {
      proc.once("error", reject);
      proc.once("exit", (code) => resolve(code));
    });
    if (timedOut) {
      throw new Error("kesha transcription timed out after 15 seconds.");
    }
    if (signal?.aborted) {
      throw new Error("kesha transcription was cancelled.");
    }
    if (exitCode !== 0) {
      throw new Error(stderr.trim() || `kesha exited with code ${exitCode}`);
    }
    return stdout;
  } finally {
    clearTimeout(timeout);
    clearTimeout(forceKill);
    signal?.removeEventListener("abort", abort);
  }
}

function buildMarkdown(r: TranscribeResult): string {
  const lines: string[] = [];
  lines.push("# Dictation");
  lines.push("");
  lines.push(r.text);
  return lines.join("\n");
}
