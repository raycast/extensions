import {
  Clipboard,
  getSelectedText,
  LaunchProps,
  LaunchType,
  closeMainWindow,
  getPreferenceValues,
  launchCommand,
  showHUD,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { PromptSpec } from "./prompt.ts";
import { composePrompt, runPrompt } from "./prompt.ts";

const execFileAsync = promisify(execFile);

/**
 * What a saved prompt Quicklink points at. On its own this command has nothing
 * to run, so it opens the builder instead of failing.
 */
export default async function Command(
  props: LaunchProps<{
    launchContext?: PromptSpec;
    arguments?: { extra?: string };
  }>,
) {
  const spec = props.launchContext;
  if (!spec?.prompt) {
    await launchCommand({ name: "add-prompt", type: LaunchType.UserInitiated });
    return;
  }

  const { orcaPath } = getPreferenceValues<Preferences.RunPrompt>();

  try {
    await closeMainWindow();

    const extra = props.arguments?.extra;
    // Only read clipboard or selection when a placeholder Raycast left
    // unexpanded actually needs them.
    const clipboard = extra?.includes("{clipboard}")
      ? await Clipboard.readText()
      : undefined;
    const selection = extra?.includes("{selection}")
      ? await getSelectedText().catch(() => undefined)
      : undefined;

    // Orca is left alone on purpose: no switch, no activation. The agent starts
    // in the background and the pane is waiting whenever you get to it.
    await runPrompt(
      {
        ...spec,
        prompt: composePrompt(spec.prompt, extra, { clipboard, selection }),
      },
      orcaPath,
      execFileAsync,
    );

    await showHUD(
      `${spec.agent} started in ${spec.worktreePath.split("/").pop()}`,
    );
  } catch (error) {
    await showFailureToast(error, { title: "Could not start the agent" });
  }
}
