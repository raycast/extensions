// Pure: no @raycast import, so `node --test` loads it.
//
// The lines a person reads: Siri's English where Siri answers the same outcome
// (VoiceTimerDialog.swift, TimerIntentHandler.swift), verbatim, missing full
// stops included. The setup failures and start's refusal are this extension's
// own (FF-1281, US English only).

import { MINUTES_ADDED_BY_DEFAULT, NOT_WHOLE_MINUTES, OVER_THE_MAXIMUM, toolMinutes } from "./minutes.ts";
import {
  isSetapp,
  MOMENT_ERROR,
  SYSTEM_ERROR,
  type Command,
  type MomentBundleId,
  type Reply,
  type TimerInfo,
} from "./timer.ts";

// Siri's lines.
const NOT_READY = "Moment is not ready yet. Please open the app first.";
const NOTHING_IN_FLIGHT = "No timer is currently running";
const NOTHING_PAUSED = "No timer is paused";
const ALREADY_FINISHED = "The timer has already finished.";
const ALREADY_PAUSED = "The timer is already paused.";
const ALREADY_RUNNING = "The timer is already running.";
// FF-1280's lines.
const START_DID_NOT_RUN = "The focus session didn't start.";
// This extension's own.
const SESSION_IN_PROGRESS = "A focus session or break is already in progress.";
const NO_ANSWER_IN_TIME = "Moment didn't answer in time.";

/** The animated toast while a command waits for Moment's answer. */
export const WAITING_FOR_MOMENT = "Waiting for Moment…";

function counted(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * VoiceTimerDialog.spokenDuration in English: the seconds the dial shows
 * (rounded up); under a minute as seconds, otherwise whole minutes as hours
 * and minutes.
 */
export function spokenDuration(seconds: number): string {
  const shown = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 0;
  if (shown < 60) return counted(shown, "second");
  const minutes = Math.floor(shown / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return counted(minutes, "minute");
  return rest === 0 ? counted(hours, "hour") : `${counted(hours, "hour")}, ${counted(rest, "minute")}`;
}

/** Siri's "how long is left" (VoiceTimerDialog.timeLeft). */
export function timeLeftLine(timer: TimerInfo): string {
  const left = spokenDuration(timer.timeLeftSeconds);
  const paused = timer.state === "paused";
  if (timer.kind === "break")
    return paused ? `This break is paused, with ${left} left.` : `${left} left in this break.`;
  return paused ? `This focus session is paused, with ${left} left.` : `${left} left in this focus session.`;
}

/** Start's refusal names the session in flight: FF-1280's 1006 wording, built from the timer read after it. */
export function inFlightLine(timer: TimerInfo): string {
  const left = spokenDuration(timer.timeLeftSeconds);
  const what = timer.kind === "break" ? "A break" : "A focus session";
  return timer.state === "paused"
    ? `${what} is paused, with ${left} left.`
    : `${what} is already running, with ${left} left.`;
}

/** The HUD after a command did what it was asked: Siri's line for the same outcome. */
export function successLine(command: Command, timer: TimerInfo): string {
  switch (command) {
    case "startFocus":
      // Siri's numbered line: the record always carries the length started.
      return `Starting ${Math.round(timer.durationSeconds / 60)} minute focus session`;
    case "pauseTimer":
      return "Timer paused";
    case "resumeTimer":
      return "Timer resumed";
    case "stopTimer":
      return "Timer stopped";
    case "addTime":
      return timer.capped ? `${OVER_THE_MAXIMUM} ${timeLeftLine(timer)}` : timeLeftLine(timer);
    case "checkTimer":
      if (timer.state === "idle") return NOTHING_IN_FLIGHT;
      if (timer.state === "finished") return ALREADY_FINISHED;
      return timeLeftLine(timer);
  }
}

export type FailureAction = "openAppStore" | "openAutomationSettings";

/** A failure toast: its title, an optional second line, and an optional action. */
export type Failure = { title: string; message?: string; action?: FailureAction };

/** What a failure's action opens. The listing is AppStoreLinks.listing. */
export const ACTIONS: Record<FailureAction, { title: string; url: string }> = {
  openAppStore: {
    title: "Open App Store",
    url: "https://apps.apple.com/app/moment-focus-timer/id6446064063",
  },
  openAutomationSettings: {
    title: "Open System Settings",
    url: "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
  },
};

export const NOT_INSTALLED: Failure = {
  title: "Moment isn't installed on this Mac.",
  message: "Moment is on the Mac App Store.",
  action: "openAppStore",
};

const TOO_OLD = "This version of Moment doesn't support Raycast.";

/** A Moment from before the dictionary: updated from the App Store, or by Setapp itself, with nothing to open. */
function tooOld(bundleId: MomentBundleId): Failure {
  return isSetapp(bundleId)
    ? { title: TOO_OLD, message: "Update Moment in Setapp." }
    : { title: TOO_OLD, message: "Update Moment from the App Store.", action: "openAppStore" };
}

const NOT_PERMITTED: Failure = {
  title: "Raycast isn't allowed to control Moment.",
  message: "Allow it in System Settings › Privacy & Security › Automation › Raycast › Moment.",
  action: "openAutomationSettings",
};

/** FF-1280's line for a reply that can't be read, or a run that never got one. */
export const COULD_NOT_COMPLETE: Failure = { title: "Moment couldn't complete the command." };

/**
 * Why a command did nothing, read from the error's number and the command,
 * never from its text, and from the Moment asked, which says where to update it.
 */
export function failureFor(
  command: Command,
  reply: Exclude<Reply, { type: "timer" }>,
  bundleId: MomentBundleId,
): Failure {
  switch (reply.type) {
    case "refusedInFlight":
      return { title: inFlightLine(reply.inFlight) };
    case "timedOut":
      return { title: NO_ANSWER_IN_TIME };
    case "unreadable":
      return COULD_NOT_COMPLETE;
    case "error":
      return failureForNumber(command, reply.number, bundleId);
  }
}

function failureForNumber(command: Command, number: number, bundleId: MomentBundleId): Failure {
  switch (number) {
    case MOMENT_ERROR.notReady:
      return { title: NOT_READY };
    case MOMENT_ERROR.nothingInFlight:
      return { title: command === "resumeTimer" ? NOTHING_PAUSED : NOTHING_IN_FLIGHT };
    case MOMENT_ERROR.alreadyFinished:
      return { title: ALREADY_FINISHED };
    case MOMENT_ERROR.alreadyPaused:
      return { title: ALREADY_PAUSED };
    case MOMENT_ERROR.alreadyRunning:
      return { title: ALREADY_RUNNING };
    case MOMENT_ERROR.sessionInFlight:
      // The read of the session in flight failed after the refusal.
      return { title: SESSION_IN_PROGRESS };
    case MOMENT_ERROR.startDidNotRun:
      return { title: START_DID_NOT_RUN };
    case SYSTEM_ERROR.coercionFailed:
      // The minutes are checked first, so this can't happen.
      return { title: NOT_WHOLE_MINUTES };
    case SYSTEM_ERROR.eventNotHandled:
      return tooOld(bundleId);
    case SYSTEM_ERROR.notPermitted:
      return NOT_PERMITTED;
    case SYSTEM_ERROR.timedOut:
      return { title: NO_ANSWER_IN_TIME };
    case SYSTEM_ERROR.applicationNotFound:
      return NOT_INSTALLED;
    default:
      return COULD_NOT_COMPLETE;
  }
}

/** The length Start Focus's confirmation shows: the minutes asked for, or the timer's own. */
export function lengthLabel(minutes: number | undefined): string {
  return minutes === undefined ? "The timer's length" : counted(minutes, "minute");
}

/** What a tool's confirmation asks the person: the action and its target, and what it will ask Moment for. */
export type ToolConfirmation = { message: string; info?: { name: string; value: string }[] };

/**
 * Start Focus's confirmation, with the length that will be asked for. None
 * when the minutes would be refused: the tool then says why at once, without
 * asking Moment, rather than after the person confirms.
 */
export function startConfirmation(minutes: unknown): ToolConfirmation | undefined {
  const argument = toolMinutes(minutes);
  if (!argument.ok) return undefined;
  return {
    message: "Start a focus session in Moment?",
    info: [{ name: "Length", value: lengthLabel(argument.minutes) }],
  };
}

/** Pause Timer's confirmation, in Stop's words (the tool's description). */
export function pauseConfirmation(): ToolConfirmation {
  return { message: "Pause the focus session or break in progress?" };
}

/** Resume Timer's confirmation, in Stop's words (the tool's description). */
export function resumeConfirmation(): ToolConfirmation {
  return { message: "Resume the paused focus session or break?" };
}

/**
 * Add Time's confirmation, with the minutes that will be added: those asked
 * for, or Moment's own 5. None when the minutes would be refused, as Start's.
 */
export function addTimeConfirmation(minutes: unknown): ToolConfirmation | undefined {
  const argument = toolMinutes(minutes);
  if (!argument.ok) return undefined;
  const added = counted(argument.minutes ?? MINUTES_ADDED_BY_DEFAULT, "minute");
  return { message: `Add ${added} to the focus session or break in progress?` };
}
