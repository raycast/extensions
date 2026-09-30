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
  if (!confirmed) return false;

  // One command: the raw command is the message, which is what every other
  // caller relies on. Many: a raw `sudo chown …` reads as an error, so count.
  const stepNoun = opts.stepNoun ?? "fix";
  const progress = (i: number) =>
    commands.length > 1 ? `Running ${stepNoun} ${i + 1} of ${commands.length}…` : commands[i];

  const handle = showActionToast({ title: toastTitle, message: progress(0), cancelable: true }); // before the await
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
      handle.updateMessage(progress(i));
      try {
        await execBrew(commands[i], { signal, raw: true });
      } catch (err) {
        // A cancel still stops immediately; only a real failure is collected.
        if (!opts.continueOnError || signal?.aborted) throw err;
        failures.push({ command: commands[i], error: ensureError(err) });
      }
      completed = i + 1;
    }
    if (failures.length > 0) {
      await handle.showFailureHUD(`${toastTitle} failed`);
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
    await handle.showSuccessHUD(`${toastTitle} done`); // toast, or HUD when closeAfterAction
    return true;
  } catch (err) {
    if (signal?.aborted) {
      // Toast already hidden by the Cancel action. Say how far it got: a
      // partial run leaves the system in a state neither before nor after.
      if (completed > 0) {
        const stopped = `Stopped after ${completed} of ${commands.length} commands`;
        await showBrewFailureToast(stopped, new Error(stopped));
      }
      return false;
    }
    await handle.showFailureHUD(`${toastTitle} failed`);
    await showBrewFailureToast(`${toastTitle} failed`, ensureError(err));
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
