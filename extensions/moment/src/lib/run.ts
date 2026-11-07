// Pure: no @raycast import, so `node --test` loads it. What a command and a
// tool do, with Raycast's and AppleScript's effects handed in by src/moment.ts.

import {
  COULD_NOT_COMPLETE,
  failureFor,
  NOT_INSTALLED,
  successLine,
  WAITING_FOR_MOMENT,
  type Failure,
} from "./lines.ts";
import { parseMinutes, toolMinutes } from "./minutes.ts";
import { argumentsFor, scriptFor } from "./scripts.ts";
import { MOMENT_BUNDLE_IDS, type Command, type MomentBundleId, type Reply, type TimerInfo } from "./timer.ts";
import { toolErrorText, toolOutput, type ToolTimer } from "./tool-output.ts";

export type Outcome = { ok: true; timer: TimerInfo } | { ok: false; failure: Failure };

/** Sends one command to Moment and reads its answer. */
export type Ask = (command: Command, minutes: number | undefined) => Promise<Outcome>;

/** What asking Moment needs from the system. */
export type AskEffects = {
  /** Every installed app's bundle id, in any order: Raycast's getApplications. */
  installedBundleIds: () => Promise<string[]>;
  /** Which of these bundle ids are running: RUNNING_SCRIPT's answer. */
  runningBundleIds: (bundleIds: string[]) => Promise<string[]>;
  runScript: (script: string, args: string[]) => Promise<Reply>;
  log: (message: string) => void;
};

/** What choosing the Moment to ask needs. */
export type ChoiceEffects = Pick<AskEffects, "installedBundleIds" | "runningBundleIds" | "log">;

/** What a typed command shows the person. */
export type CommandFeedback = {
  /** Shows the animated waiting toast; the function it gives turns that toast into a failure. */
  waiting: (title: string) => Promise<(failure: Failure) => void>;
  hud: (line: string) => Promise<void>;
  failure: (failure: Failure) => Promise<void>;
};

/**
 * The Moment to ask, by bundle id: the one installed, whatever the order or
 * repeats of Raycast's list. With both, the first running, else the App
 * Store's: a running Setapp Moment is asked rather than a second timer
 * launched. Undefined when neither is installed. The running check runs only
 * with both, and one that fails counts as none running.
 */
export async function chooseBundleId(effects: ChoiceEffects): Promise<MomentBundleId | undefined> {
  const installed = new Set(await effects.installedBundleIds());
  const moments = MOMENT_BUNDLE_IDS.filter((bundleId) => installed.has(bundleId));
  if (moments.length < 2) return moments[0];
  const running = await runningAmong(effects, moments);
  return moments.find((bundleId) => running.includes(bundleId)) ?? moments[0];
}

/** The running check, logged when it fails. */
async function runningAmong(effects: ChoiceEffects, moments: string[]): Promise<string[]> {
  try {
    return await effects.runningBundleIds(moments);
  } catch (error) {
    effects.log(`Moment's running check didn't run: ${String(error)}`);
    return [];
  }
}

/** Chooses the Moment installed, then runs the command's one script on it; a failure names that Moment's store. Never throws. */
export async function askWith(effects: AskEffects, command: Command, minutes: number | undefined): Promise<Outcome> {
  try {
    const bundleId = await chooseBundleId(effects);
    if (bundleId === undefined) return { ok: false, failure: NOT_INSTALLED };
    const reply = await effects.runScript(scriptFor(command), argumentsFor(bundleId, minutes));
    if (reply.type === "timer") return { ok: true, timer: reply.timer };
    if (reply.type === "error") effects.log(`Moment answered ${command} with error ${reply.number}: ${reply.message}`);
    return { ok: false, failure: failureFor(command, reply, bundleId) };
  } catch (error) {
    effects.log(`Moment's ${command} didn't run: ${String(error)}`);
    return { ok: false, failure: COULD_NOT_COMPLETE };
  }
}

/** A typed command: the minutes are checked before Moment is asked; then one HUD line, or the failure. */
export async function runCommandWith(
  ask: Ask,
  feedback: CommandFeedback,
  command: Command,
  minutesText?: string,
): Promise<void> {
  const argument = parseMinutes(minutesText);
  if (!argument.ok) {
    await feedback.failure({ title: argument.title });
    return;
  }
  const fail = await feedback.waiting(WAITING_FOR_MOMENT);
  const outcome = await ask(command, argument.minutes);
  if (outcome.ok) {
    await feedback.hud(successLine(command, outcome.timer));
  } else {
    fail(outcome.failure);
  }
}

/** A Raycast AI tool: the timer after the command, through `toolOutput` only, or an error saying why. */
export async function runToolWith(ask: Ask, command: Command, minutes?: unknown): Promise<ToolTimer> {
  const argument = toolMinutes(minutes);
  if (!argument.ok) throw new Error(argument.title);
  const outcome = await ask(command, argument.minutes);
  if (!outcome.ok) throw new Error(toolErrorText(outcome.failure));
  return toolOutput(outcome.timer);
}
