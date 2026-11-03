import { Clipboard, LaunchType, launchCommand, PopToRootType, showHUD } from "@raycast/api";
import type { PromptDef } from "../core/types";
import { insertAfterSelection } from "../prompts/postprocess";
import { buildMessages, finalizeText, modelName, recordUse, streamRun } from "./execute";
import { needsWindow, toRunFailure } from "./failure";
import { frontmostAppId, type RunInput, type SessionContext } from "./input";
import { resolveRun } from "./resolve";
import { issueLaunchId } from "./session-context";

export const SESSION_COMMAND = "prompt-session";
export const RUN_COMMAND = "run-prompt";

/** Set for a run that continues a view: its window closed, but the command must stay loaded until the paste. */
export interface WindowlessOptions {
  keepLoaded?: boolean;
}

type Hud = (title: string) => Promise<void>;

/**
 * A paste lands in whatever app is in front. If the user moved on during a long run, or the source app is unknown and a
 * switch could go unnoticed, the result goes to the clipboard instead of into the wrong document.
 */
async function pasteIntoSource(text: string, sourceApp: string | undefined, done: string, hud: Hud): Promise<void> {
  const current = sourceApp === undefined ? undefined : await frontmostAppId();
  if (sourceApp === undefined || current !== sourceApp) {
    await Clipboard.copy(text, { concealed: true });
    await hud(sourceApp === undefined ? "Source App Unknown: Result Copied" : "App Changed: Result Copied");
    return;
  }
  await Clipboard.paste(text);
  await hud(done);
}

async function deliver(prompt: PromptDef, input: RunInput, result: string, hud: Hud): Promise<void> {
  // Without a window, the HUD is the only place to mention shortened input.
  const suffix = input.notices.length > 0 ? ` (${input.notices.join(" ")})` : "";
  const done = `Done${suffix}`;
  switch (prompt.output) {
    case "copy":
      await Clipboard.copy(result, { concealed: true });
      await hud(`Result Copied${suffix}`);
      return;
    case "insertAfter":
      await pasteIntoSource(insertAfterSelection(input.selection ?? "", result), input.sourceApp, done, hud);
      return;
    default:
      await pasteIntoSource(result, input.sourceApp, done, hud);
  }
}

/** Opens the session on the same input, which keeps the selection when the user fixes the problem. */
export async function openSession(context: Omit<SessionContext, "launchId">): Promise<void> {
  const launch: SessionContext = { ...context, launchId: issueLaunchId() };
  await launchCommand({ name: SESSION_COMMAND, type: LaunchType.UserInitiated, context: launch });
}

/**
 * Runs a prompt without a window (`replace`, `copy`, `insertAfter`). There is deliberately no cancel path: closing a
 * window is no signal here, and the provider layer's idle timeout bounds a stuck request.
 *
 * Returns true when a failure handed the run over to a session window.
 */
export async function runWithoutWindow(
  prompt: PromptDef,
  input: RunInput,
  args: Record<string, string> = {},
  options: WindowlessOptions = {},
): Promise<boolean> {
  // A plain HUD applies the user's pop-to-root preference, which would unload a command that still has work to do.
  const hud: Hud = (title) =>
    showHUD(title, options.keepLoaded ? { popToRootType: PopToRootType.Suspended } : undefined);
  try {
    const run = await resolveRun(prompt);
    const messages = await buildMessages(prompt, input, args);
    await hud(`Processing with ${modelName(run)}…`);
    recordUse(prompt.id);
    const { text } = await streamRun(run, messages, new AbortController().signal);
    await deliver(prompt, input, finalizeText(text, input.selection), hud);
    return false;
  } catch (error) {
    const failure = toRunFailure(error);
    if (needsWindow(failure)) {
      await openSession({ promptId: prompt.id, input, args, forcePreview: true });
      return true;
    }
    // HUDs are one line and offer no actions, so they name the problem and nothing else.
    await hud(`${failure.title}: ${failure.message}`);
    return false;
  }
}
