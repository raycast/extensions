import { Clipboard, environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, open, unlink, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { generateSpeech } from "./api";
import { toWav } from "./audio";
import { errorJobId, recoveryText, saveRecovery, updateRecovery, type RecoveryRecord } from "./recovery";

const execFileAsync = promisify(execFile);
const MAX_TEXT_LENGTH = 10_000;

export interface SpeechFeedback {
  title: string;
  message?: string;
  requestId?: string;
  phase: "waiting" | "playing" | "finished";
}

export async function speakText(
  getText: () => Promise<string | undefined>,
  signal?: AbortSignal,
  onFeedback?: (feedback: SpeechFeedback) => void,
): Promise<void> {
  const controller = new AbortController();
  const operationSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  let audioPath: string | undefined;
  let file: FileHandle | undefined;
  let record: RecoveryRecord | undefined;
  let persisted = false;
  let apiKey = "";
  let text = "";

  try {
    operationSignal.throwIfAborted();
    text = (await getText())?.trim() ?? "";
    operationSignal.throwIfAborted();
    if (!text) throw new Error("Select or copy some text first");
    if (text.length > MAX_TEXT_LENGTH)
      throw new Error(`Text is too long. Use ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer`);

    const preferences = getPreferenceValues<Preferences>();
    apiKey = preferences.apiKey;
    record = { requestId: randomUUID(), createdAt: new Date().toISOString(), state: "pending" };

    // Reserve a private output file and persist identity before any paid submission.
    await mkdir(environment.supportPath, { recursive: true });
    const candidate = path.join(environment.supportPath, `flowspeech-${record.requestId}.wav`);
    file = await open(candidate, "wx", 0o600);
    audioPath = candidate;
    operationSignal.throwIfAborted();
    await saveRecovery(record);
    persisted = true;
    const copyId = record.requestId;
    onFeedback?.({ title: "Generating speech...", message: recoveryText(record), requestId: copyId, phase: "waiting" });
    await showToast({
      style: Toast.Style.Animated,
      title: "Generating speech...",
      message: `requestId=${copyId}`,
      primaryAction: { title: "Stop Waiting", onAction: () => controller.abort() },
      secondaryAction: {
        title: "Copy Request ID",
        onAction: () => {
          void Clipboard.copy(copyId);
        },
      },
    });

    const generatedAudio = await generateSpeech(text, preferences.voiceName, apiKey, record.requestId, operationSignal);
    record = { ...record, jobId: generatedAudio.jobId };
    // The pre-submission record remains recoverable if this optional update fails.
    await updateRecovery(record).catch(() => undefined);
    const wav = toWav(generatedAudio);
    operationSignal.throwIfAborted();
    await file.writeFile(wav, { signal: operationSignal });
    await file.close();
    file = undefined;

    onFeedback?.({
      title: "Playing with FlowSpeech",
      message: recoveryText(record),
      requestId: copyId,
      phase: "playing",
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Playing with FlowSpeech",
      message: recoveryText(record),
      primaryAction: { title: "Stop Playback", onAction: () => controller.abort() },
    });
    operationSignal.throwIfAborted();
    await execFileAsync("/usr/bin/afplay", [audioPath], { signal: operationSignal });
    record = { ...record, state: "completed" };
    await updateRecovery(record).catch(() => undefined);
    onFeedback?.({ title: "Speech finished", message: recoveryText(record), requestId: copyId, phase: "finished" });
  } catch (error) {
    if (record && persisted) {
      record = { ...record, jobId: record.jobId ?? errorJobId(error), state: "interrupted" };
      await updateRecovery(record).catch(() => undefined);
    }
    let message = operationSignal.aborted
      ? "Local operation stopped; the server job was not cancelled."
      : error instanceof Error
        ? error.message
        : "Speech operation failed";
    if (apiKey) message = message.split(apiKey).join("[redacted]");
    if (text) message = message.split(text).join("[text]");
    if (record && persisted) message += `\n${recoveryText(record)}`;
    const copyId = persisted ? record?.requestId : undefined;
    onFeedback?.({
      title: operationSignal.aborted ? "Speech stopped" : "Could not play speech",
      message,
      requestId: copyId,
      phase: "finished",
    });
    await showToast({
      style: Toast.Style.Failure,
      title: operationSignal.aborted
        ? persisted
          ? "Speech stopped; recovery ID saved"
          : "Speech stopped"
        : "Could not play speech",
      message,
      ...(copyId
        ? {
            primaryAction: {
              title: "Copy Request ID",
              onAction: () => {
                void Clipboard.copy(copyId);
              },
            },
          }
        : {}),
    });
  } finally {
    await file?.close().catch(() => undefined);
    if (audioPath) await unlink(audioPath).catch(() => undefined);
  }
}
