import { LaunchType, launchCommand, showHUD, type LaunchProps } from "@raycast/api";
import { runWithoutWindow, openSession, SESSION_COMMAND } from "./commands/headless";
import { RunFailure, toRunFailure } from "./commands/failure";
import { collectInput } from "./commands/input";
import { getPrompt } from "./prompts/store";
import { extractRequirements } from "./prompts/template/render";

interface RunPromptContext {
  promptId?: string;
}

async function run(promptId: string): Promise<void> {
  const prompt = await getPrompt(promptId);
  if (!prompt) throw new RunFailure("prompt-not-found", "Prompt Not Found", "Check Manage Prompts.");
  if (!prompt.enabled) throw new RunFailure("prompt-disabled", "Prompt Disabled", "Enable it in Manage Prompts.");

  const requirements = extractRequirements(prompt.template);
  const input = await collectInput(requirements);

  if (prompt.output === "preview" || requirements.arguments.length > 0) {
    await openSession({ promptId, input });
    return;
  }
  await runWithoutWindow(prompt, input);
}

/**
 * Target of every quicklink. Its name, the extension name, and the author are part of those links, so none of them
 * may change. Running without a view avoids opening a window that `replace` would have to close right away.
 */
export default async function Command(props: LaunchProps<{ launchContext: RunPromptContext }>) {
  const promptId = props.launchContext?.promptId;
  try {
    if (promptId) await run(promptId);
    else await launchCommand({ name: SESSION_COMMAND, type: LaunchType.UserInitiated });
  } catch (error) {
    const failure = toRunFailure(error);
    await showHUD(`${failure.title}: ${failure.message}`);
  }
}
