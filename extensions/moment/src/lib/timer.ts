// Pure: no @raycast import, so `node --test` loads it.

/** Moment for Mac's bundle ids, the App Store's first, then Setapp's (FF-1309): the one place they live. */
export const MOMENT_BUNDLE_IDS = ["studio.lumi.moment", "studio.lumi.moment-setapp"] as const;

/** The Moment asked: one of MOMENT_BUNDLE_IDS. */
export type MomentBundleId = (typeof MOMENT_BUNDLE_IDS)[number];

/** Setapp's Moment, which Setapp updates rather than the App Store. */
export function isSetapp(bundleId: MomentBundleId): boolean {
  return bundleId === "studio.lumi.moment-setapp";
}

/** FF-1280's commands (MomentMac/Moment.sdef), by the names MomentCore gives them. */
export type Command = "startFocus" | "pauseTimer" | "resumeTimer" | "addTime" | "stopTimer" | "checkTimer";

export const COMMANDS: readonly Command[] = [
  "startFocus",
  "pauseTimer",
  "resumeTimer",
  "addTime",
  "stopTimer",
  "checkTimer",
];

/** Each command's `name` in the manifest: its file in src/ and in src/tools/. */
export const COMMAND_FILE_NAMES: Record<Command, string> = {
  startFocus: "start-focus",
  pauseTimer: "pause-timer",
  resumeTimer: "resume-timer",
  addTime: "add-time",
  stopTimer: "stop-timer",
  checkTimer: "time-left",
};

/** Each command's title in Raycast: Siri's short title (MomentShortcuts in Moment/Intents/StartTimer.swift). */
export const COMMAND_TITLES: Record<Command, string> = {
  startFocus: "Start Focus",
  pauseTimer: "Pause Timer",
  resumeTimer: "Resume Timer",
  addTime: "Add Time",
  stopTimer: "Stop Timer",
  checkTimer: "Time Left",
};

/** Moment's own refusals (FF-1280's `ScriptTimerError.number`), one number per reason. */
export const MOMENT_ERROR = {
  notReady: 1001,
  nothingInFlight: 1002,
  alreadyFinished: 1003,
  alreadyPaused: 1004,
  alreadyRunning: 1005,
  sessionInFlight: 1006,
  startDidNotRun: 1007,
} as const;

/** The system's AppleScript errors this extension tells apart. */
export const SYSTEM_ERROR = {
  /** errAECoercionFail: the minutes weren't a number. */
  coercionFailed: -1700,
  /** errAEEventNotHandled: a Moment from before the dictionary. */
  eventNotHandled: -1708,
  /** errAETimeout: `with timeout` ran out. */
  timedOut: -1712,
  /** errAEEventNotPermitted: Raycast's Automation permission is off. */
  notPermitted: -1743,
  /** Launch Services' "application not found". */
  applicationNotFound: -10814,
} as const;

const STATES = ["idle", "running", "paused", "finished"] as const;
const KINDS = ["focus", "break", "none"] as const;

export type TimerState = (typeof STATES)[number];
export type TimerKind = (typeof KINDS)[number];

/** FF-1280's `timer info` record: the timer after a command. */
export type TimerInfo = {
  state: TimerState;
  kind: TimerKind;
  timeLeftSeconds: number;
  durationSeconds: number;
  /** The 90-minute maximum cut the time `add time` added. */
  capped: boolean;
};

/** What one run of a command's script came to. */
export type Reply =
  | { type: "timer"; timer: TimerInfo }
  /** Start refused (1006), with the session in flight read right after. */
  | { type: "refusedInFlight"; inFlight: TimerInfo }
  /** An AppleScript error: Moment's own (1001–1007) or the system's. */
  | { type: "error"; number: number; message: string }
  | { type: "timedOut" }
  | { type: "unreadable" };

/** The part of runAppleScript's `parseOutput` argument this reads. */
export type ScriptOutput = { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean };

function isOneOf<T extends string>(values: readonly T[], text: string): text is T {
  return (values as readonly string[]).includes(text);
}

function seconds(text: string): number | undefined {
  return /^\d+$/.test(text) ? Number(text) : undefined;
}

/** The five fields `replyLine` prints, in the record's order; undefined if any is off. */
function timerFrom(fields: string[]): TimerInfo | undefined {
  if (fields.length !== 5) return undefined;
  const [state, kind, timeLeft, duration, capped] = fields;
  const timeLeftSeconds = seconds(timeLeft);
  const durationSeconds = seconds(duration);
  if (!isOneOf(STATES, state) || !isOneOf(KINDS, kind)) return undefined;
  if (timeLeftSeconds === undefined || durationSeconds === undefined) return undefined;
  if (capped !== "true" && capped !== "false") return undefined;
  return { state, kind, timeLeftSeconds, durationSeconds, capped: capped === "true" };
}

/**
 * Reads the one line a command's script prints:
 * `ok⇥state⇥kind⇥timeLeft⇥duration⇥capped`, `refused⇥1006⇥…the timer…` or
 * `error⇥number⇥message`. A run that ends non-zero (an error the script
 * didn't catch) is read by the number at the end of stderr. Decisions are
 * made on numbers; the message is kept for logs only.
 */
export function parseReply(output: ScriptOutput): Reply {
  if (output.timedOut) return { type: "timedOut" };
  if (output.exitCode !== 0) {
    const match = /\((-?\d+)\)\s*$/.exec(output.stderr);
    return match ? { type: "error", number: Number(match[1]), message: "" } : { type: "unreadable" };
  }
  const [head, ...rest] = output.stdout.split("\t");
  if (head === "ok") {
    const timer = timerFrom(rest);
    return timer ? { type: "timer", timer } : { type: "unreadable" };
  }
  if (head === "refused" && rest[0] === "1006") {
    const inFlight = timerFrom(rest.slice(1));
    return inFlight ? { type: "refusedInFlight", inFlight } : { type: "error", number: 1006, message: "" };
  }
  if (head === "error" && /^-?\d+$/.test(rest[0] ?? "")) {
    return { type: "error", number: Number(rest[0]), message: rest.slice(1).join("\t") };
  }
  return { type: "unreadable" };
}

/** The running check's answer (RUNNING_SCRIPT): the bundle ids it printed. A run that failed throws, so it's logged. */
export function parseRunning(output: ScriptOutput): string[] {
  if (output.timedOut) throw new Error("The running check timed out.");
  if (output.exitCode !== 0) throw new Error(`The running check failed: ${output.stderr}`);
  return output.stdout === "" ? [] : output.stdout.split("\t");
}
