/**
 * Everything a reading needs, with no Raycast in sight.
 *
 * Both worlds run this file: the Raycast commands (which add the HUD on top) and
 * the background worker that serves the reader panel. Keeping one copy is the whole
 * point — a speed change from a chip on the panel and a speed change from the
 * command palette must produce byte-identical audio.
 */
import { ensureWorker, readCurrentJob, submitJob } from "./player.js";
import {
  AzureCredentials,
  clampRate,
  loadSettings,
  rateStep,
  resolveEngine,
  saveSettings,
} from "./settings.js";
import { buildJob } from "./synth.js";
import { Job, isSpeaking, readLiveStatus, sendControl } from "./state.js";

/** The two things that cannot be discovered from disk: where the assets are, and the key. */
export type Env = {
  assetsDir: string;
  credentials: AzureCredentials | undefined;
};

export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? "Unknown error");

/**
 * Turn a piece of text into audio and hand it to the reader.
 * `charOffset` is where to start speaking; the rest is still shown in the overlay.
 */
export const startReading = async (
  env: Env,
  fullText: string,
  charOffset = 0,
  continuation = false,
): Promise<Job> => {
  const settings = loadSettings();
  const engine = resolveEngine(settings, env.credentials);
  const job = await buildJob({
    fullText,
    charOffset,
    settings,
    engine,
    credentials: engine === "azure" ? env.credentials : undefined,
    continuation,
    assetsDir: env.assetsDir,
  });
  await submitJob(job, settings.overlay, env.assetsDir);
  return job;
};

const clampInto = (text: string, pos: number) =>
  Math.min(Math.max(pos, 0), Math.max(0, text.length - 1));

export type RateOutcome =
  /** Already at that speed — the ends of the range included. */
  | { kind: "limit"; rate: number }
  /** Saved for the next reading, but nothing is playing right now. */
  | { kind: "stored"; rate: number }
  | { kind: "changed"; rate: number }
  | { kind: "failed"; rate: number; message: string };

/**
 * Speed is applied by re-synthesising the rest of the text at the new rate instead of
 * resampling the audio: the pitch stays exactly where the voice put it. The reader is
 * paused first so the old audio never overlaps the new one.
 */
export const applyRate = async (
  env: Env,
  target: number,
): Promise<RateOutcome> => {
  const settings = loadSettings();
  const rate = clampRate(target);
  if (rate === settings.rate) return { kind: "limit", rate };

  saveSettings({ ...settings, rate });

  const status = readLiveStatus();
  const job = readCurrentJob();
  if (!isSpeaking(status) || !job) return { kind: "stored", rate };

  // Never before the start of this audio: the position we resume from is the word the
  // voice had reached, and everything earlier was already spoken at the old speed.
  const resumeFrom = clampInto(
    job.text,
    Math.max(status.charPos, job.charOffset),
  );
  sendControl("pause");
  try {
    await startReading(env, job.text, resumeFrom, true);
    return { kind: "changed", rate };
  } catch (error) {
    sendControl("resume");
    return { kind: "failed", rate, message: messageOf(error) };
  }
};

export const applyRateDelta = (env: Env, direction: 1 | -1) =>
  applyRate(env, loadSettings().rate + direction * rateStep);

export type SeekOutcome =
  | { kind: "idle" }
  | { kind: "moved"; pos: number }
  | { kind: "failed"; message: string };

/**
 * Read again from `pos`, wherever it is in the text.
 *
 * The panel handles a click on a word it already has audio for by seeking inside the
 * wav — instant, and free. This path is the other half: the word is behind the start
 * of the current audio, so the only way back to it is a new synthesis.
 */
export const seekTo = async (env: Env, pos: number): Promise<SeekOutcome> => {
  const status = readLiveStatus();
  const job = readCurrentJob();
  if (!isSpeaking(status) || !job) return { kind: "idle" };

  const from = clampInto(job.text, pos);
  sendControl("pause");
  try {
    await startReading(env, job.text, from, true);
    return { kind: "moved", pos: from };
  } catch (error) {
    sendControl("resume");
    return { kind: "failed", message: messageOf(error) };
  }
};

/**
 * Start a reading with the panel's controls armed.
 *
 * The worker goes up first, before the synthesis: a long text takes seconds to build,
 * and that is exactly the window in which the panel appears and the first speed chip
 * gets clicked. Spawning it afterwards would leave those first clicks unanswered.
 */
export const startReadingWithControls = async (env: Env, fullText: string) => {
  await ensureWorker(env.assetsDir, env.credentials);
  return startReading(env, fullText);
};
