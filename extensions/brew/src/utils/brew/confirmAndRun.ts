/**
 * Confirm-then-run for mutating commands that aren't plain `brew <args>` —
 * e.g. Doctor's `sudo chown …` / `chmod …` remediations. Commands are shown
 * verbatim in the confirmation alert and executed exactly as given, which is
 * what `execBrew`'s `raw` mode is for.
 */

import { Alert, confirmAlert } from "@raycast/api";
import { execBrew } from "./commands";
import { showActionToast, showBrewFailureToast } from "../toast";
import { BrewError, BrewLockError, ensureError } from "../errors";
import { ExecError } from "../types";
import { actionsLogger } from "../logger";

/** `confirmAlert`'s message does not scroll, so a long list is listed in part and counted. */
const MAX_LISTED_COMMANDS = 8;

/**
 * Confirm, then run each command in order.
 *
 * Returns `true` when the run succeeded, `false` on cancel or failure. With
 * `continueOnError` the boolean means "something ran": `true` when at least one
 * command succeeded (even if others failed), `false` only on cancel or when
 * every command failed.
 */
export async function confirmAndRun(
  commands: string[],
  opts: {
    title: string;
    toastTitle?: string;
    message?: string;
    cancel?: AbortSignal;
    /** Progress noun for multi-command runs: "Running {stepNoun} 2 of 5…". Default "fix". */
    stepNoun?: string;
    /** Run every command even if one fails, then report all failures at once. Default false. */
    continueOnError?: boolean;
    /**
     * Re-check a precondition AFTER the user confirms and immediately before
     * anything runs; resolve false to abort. The dialog is modal but not
     * instantaneous — the world can change while it is open — so a check made
     * before `confirmAlert` is stale by the time the command starts.
     */
    beforeRun?: () => Promise<boolean>;
    /**
     * Human wording for the toasts. Without it a single-command run shows the
     * raw command as its progress message — right for Doctor, whose commands
     * are the point (`sudo chown …`), and meaningless for a routine action,
     * which would otherwise read as "Adopt" over `/opt/homebrew/bin/brew …`.
     */
    labels?: { progress?: string; success?: string; failure?: string };
    /**
     * Run one command yourself instead of through the buffered `execBrew`,
     * reporting progress with `report` — which sets the toast's message. For a
     * long brew operation whose phases are worth showing as they happen.
     */
    run?: (command: string, signal: AbortSignal | undefined, report: (message: string) => void) => Promise<unknown>;
  },
): Promise<boolean> {
  // The alert can carry a full prose sentence (Doctor passes brew's own
  // finding text); toasts need something short, so they get their own title.
  const toastTitle = opts.toastTitle ?? opts.title;
  const hidden = commands.length - MAX_LISTED_COMMANDS;
  const confirmed = await confirmAlert({
    title: opts.title,
    message: [
      opts.message,
      ...commands.slice(0, MAX_LISTED_COMMANDS), // exact commands listed; the page has the full list
      hidden > 0 ? `…and ${hidden} more` : undefined,
    ]
      .filter(Boolean)
      .join("\n"),
    primaryAction: { title: "Run", style: Alert.ActionStyle.Default },
    dismissAction: { title: "Cancel" },
  });
  // Every run is logged, because this runs arbitrary shell strings — Doctor's
  // remediations include `sudo chown` — and nothing else records that one
  // happened. The command text is logged; passwords never pass through
  // here (sudo reads them via SUDO_ASKPASS).
  if (!confirmed) {
    actionsLogger.log("Run canceled at confirmation", { title: opts.title, commands });
    return false;
  }
  if (opts.beforeRun && !(await opts.beforeRun())) {
    actionsLogger.log("Run stopped before starting: precondition no longer holds", { title: opts.title, commands });
    return false;
  }
  actionsLogger.log("Running confirmed commands", { title: opts.title, count: commands.length, commands });

  // One command: the raw command is the message, which is what every other
  // caller relies on. Many: a raw `sudo chown …` reads as an error, so count.
  const stepNoun = opts.stepNoun ?? "fix";
  const progress = (i: number) =>
    commands.length > 1 ? `Running ${stepNoun} ${i + 1} of ${commands.length}…` : commands[i];

  const failureTitle = opts.labels?.failure ?? `${toastTitle} failed`;
  // With a human progress label, a single command needs no message under it.
  const quiet = opts.labels?.progress !== undefined && commands.length === 1;
  const handle = showActionToast({
    title: opts.labels?.progress ?? toastTitle,
    message: quiet ? undefined : progress(0),
    cancelable: true,
  }); // before the await
  // Named so it can be detached below: a listener left on the caller's signal
  // outlives this run and would hide whatever toast is on screen later.
  const onExternalAbort = () => {
    handle.abort?.abort();
    handle.hide(); // the toast's own Cancel action hides itself; an external abort must too
  };
  opts.cancel?.addEventListener("abort", onExternalAbort, { once: true });
  const signal = handle.abort?.signal;
  let completed = 0;
  const failures: { command: string; error: Error }[] = [];
  try {
    for (let i = 0; i < commands.length; i++) {
      if (!quiet) handle.updateMessage(progress(i));
      const step = { step: i + 1, of: commands.length, command: commands[i] };
      try {
        if (opts.run) await opts.run(commands[i], signal, (message) => handle.updateMessage(message));
        else await execBrew(commands[i], { signal, raw: true });
        actionsLogger.log("Command succeeded", step);
      } catch (err) {
        const error = ensureError(err);
        if (!signal?.aborted) actionsLogger.error("Command failed", { ...step, ...describeFailure(error) });
        // A cancel still stops immediately; only a real failure is collected.
        if (!opts.continueOnError || signal?.aborted) throw err;
        failures.push({ command: commands[i], error });
      }
      completed = i + 1;
    }
    if (failures.length > 0) {
      actionsLogger.warn("Run finished with failures", {
        title: opts.title,
        failed: failures.length,
        of: commands.length,
      });
      await handle.showFailureHUD(failureTitle);
      const lines = failureLines(failures);
      const headline = `${failures.length} of ${commands.length} failed — ${failures[0].command}${
        failures.length > 1 ? " …" : ""
      }`;
      // A lock failed everything after it too, so the whole run is presented as
      // one: `showBrewFailureToast` then gives it "Brew is Busy" and its tip.
      const lock = failures.find((f) => f.error instanceof BrewLockError)?.error;
      // One toast for the whole run; Copy Logs carries every failure.
      await showBrewFailureToast(
        `${toastTitle}: ${failures.length} of ${commands.length} failed`,
        lock ?? failures[0].error,
        {
          summary: { headline, lines },
        },
      );
      return failures.length < commands.length;
    }
    actionsLogger.log("Run completed", { title: opts.title, count: commands.length });
    await handle.showSuccessHUD(opts.labels?.success ?? `${toastTitle} done`); // toast, or HUD when closeAfterAction
    return true;
  } catch (err) {
    if (signal?.aborted) {
      actionsLogger.log("Run canceled", { title: opts.title, completed, of: commands.length });
      // Toast already hidden by the Cancel action. Say how far it got: a
      // partial run leaves the system in a state neither before nor after.
      if (completed > 0) {
        const stopped = `Stopped after ${completed} of ${commands.length} commands`;
        await showBrewFailureToast(stopped, new Error(stopped));
      }
      return false;
    }
    await handle.showFailureHUD(failureTitle);
    await showBrewFailureToast(failureTitle, ensureError(err));
    return false;
  } finally {
    opts.cancel?.removeEventListener("abort", onExternalAbort);
  }
}

/**
 * One line per failed command: exit code and the first line of its output.
 *
 * Read off the UNWRAPPED error — `execBrew` re-throws a lock failure as a
 * `BrewLockError` that carries neither the exit code nor stderr, keeping the
 * original as `brewCause`.
 */
function failureLines(failures: { command: string; error: Error }[]): string[] {
  return failures.map(({ command, error }) => {
    const raw = error instanceof BrewError && error.brewCause ? error.brewCause : error;
    const execErr = raw as ExecError;
    const output = execErr.stderr || execErr.stdout || raw.message || "";
    const firstLine =
      output
        .split("\n")
        .map((line) => line.trim())
        .find(Boolean) ?? "failed";
    return `${command}${execErr.code === undefined ? "" : ` (exit ${execErr.code})`}: ${firstLine}`;
  });
}

/** The parts of a failed command worth keeping, bounded so one run cannot flood the log. */
function describeFailure(error: Error): { message: string; exitCode?: number; stderr?: string } {
  // `execBrew` rejects with an ExecError (`code`); the streaming runner rejects
  // with a BrewCommandError (`exitCode`). Read both, or a failed adoption logs
  // no exit code at all.
  const exec = error as Partial<ExecError> & { exitCode?: unknown };
  const stderr = typeof exec.stderr === "string" ? exec.stderr.trim() : "";
  const code = typeof exec.code === "number" ? exec.code : exec.exitCode;
  return {
    message: error.message,
    exitCode: typeof code === "number" ? code : undefined,
    stderr: stderr ? stderr.slice(-2000) : undefined,
  };
}
