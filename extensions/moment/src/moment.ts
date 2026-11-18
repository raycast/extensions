// The one module that touches Raycast and AppleScript: it hands their effects
// to src/lib/run.ts, where what a command and a tool do is tested without
// Raycast.
import { getApplications, open, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { ACTIONS, type Failure } from "./lib/lines.ts";
import { askWith, runCommandWith, runToolWith, type Ask, type CommandFeedback } from "./lib/run.ts";
import { RUNNING_CHECK_TIMEOUT_MILLISECONDS, RUNNING_SCRIPT, SCRIPT_TIMEOUT_MILLISECONDS } from "./lib/scripts.ts";
import { parseReply, parseRunning, type Command } from "./lib/timer.ts";
import type { ToolTimer } from "./lib/tool-output.ts";

/** Read before any script, so a missing app is never asked for at run time. src/lib/run.ts picks Moment's. */
async function installedBundleIds(): Promise<string[]> {
  const applications = await getApplications();
  return applications.flatMap((application) => (application.bundleId ? [application.bundleId] : []));
}

const ask: Ask = (command, minutes) =>
  askWith(
    {
      installedBundleIds,
      runningBundleIds: (bundleIds) =>
        runAppleScript(RUNNING_SCRIPT, bundleIds, {
          timeout: RUNNING_CHECK_TIMEOUT_MILLISECONDS,
          parseOutput: parseRunning,
        }),
      runScript: (script, args) =>
        runAppleScript(script, args, { timeout: SCRIPT_TIMEOUT_MILLISECONDS, parseOutput: parseReply }),
      log: (message) => console.error(message),
    },
    command,
    minutes,
  );

function fail(toast: Toast, failure: Failure) {
  toast.style = Toast.Style.Failure;
  toast.title = failure.title;
  toast.message = failure.message;
  if (failure.action) {
    const action = ACTIONS[failure.action];
    toast.primaryAction = { title: action.title, onAction: () => open(action.url) };
  }
}

const feedback: CommandFeedback = {
  waiting: async (title) => {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    return (failure) => fail(toast, failure);
  },
  hud: (line) => showHUD(line),
  failure: async (failure) => {
    await showToast({ style: Toast.Style.Failure, title: failure.title, message: failure.message });
  },
};

/** A typed command: one HUD line when Moment did it, or a failure toast saying why it didn't. */
export async function runCommand(command: Command, minutesText?: string): Promise<void> {
  return runCommandWith(ask, feedback, command, minutesText);
}

/** A Raycast AI tool: the timer after the command, or an error saying why nothing happened. */
export async function runTool(command: Command, minutes?: unknown): Promise<ToolTimer> {
  return runToolWith(ask, command, minutes);
}
