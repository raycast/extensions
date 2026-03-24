// Command pipeline entry for no-view preset commands.
import {
  getPreferenceValues,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { resolveExecutionContext } from "./executionContext";
import { getInputText } from "./input";
import { logger } from "./logger";
import { registerTask } from "./taskState";
import { runInlineFlow } from "./execution";
import { getOnboardingCompleted } from "./storage";

export type TextCommandConfig = {
  name?: string;
  title: string;
  prompt: string;
  description?: string;
  icon?: string;
  mode?: "no-view" | "view";
};

/**
 * Execution pipeline for no-view preset commands.
 * Checks settings: if inline processing is disabled, routes to panel mode immediately.
 */
export async function runTextCommand(
  config: TextCommandConfig,
  inputOverride?: string,
): Promise<void> {
  const taskName = config.name || config.title;
  const task = registerTask(taskName);

  if (task.isDuplicate) {
    // Show cancellation and exit without removing lock since it's already cleared
    await showToast({
      style: Toast.Style.Failure,
      title: "Cancelled",
      message: "Command interrupted",
    });
    return;
  }

  // Check Onboarding
  const hasCompletedOnboarding = await getOnboardingCompleted();
  if (!hasCompletedOnboarding) {
    // CRITICAL: Cleanup the task lock before redirecting, otherwise subsequent runs will see a "duplicate" task
    task.cleanup();
    await launchCommand({
      name: "inflow-settings",
      type: LaunchType.UserInitiated,
    });
    return;
  }

  try {
    const input =
      inputOverride !== undefined ? inputOverride.trim() : await getInputText();

    // Abort if no text is selected
    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text selected",
      });
      return;
    }

    const context = await resolveExecutionContext();

    // Use custom prompt from preferences if configured, otherwise use default
    const prefs = getPreferenceValues<{ customPrompt?: string }>();
    let activePrompt =
      prefs.customPrompt && prefs.customPrompt.trim().length > 0
        ? prefs.customPrompt
        : config.prompt;

    if (context.settings.editableTextHandling !== "inline") {
      // Inline processing disabled, fallback to panel mode in ALL scenarios.
      await launchCommand({
        name: "ai-command",
        type: LaunchType.UserInitiated,
        context: {
          autoRunPrompt: activePrompt,
          autoRunTitle: config.title,
          autoRunInput: input,
        },
      });
      return;
    }

    // Inline processing enabled, proceed with silent mode and fallback
    await runInlineFlow({
      prompt: activePrompt,
      input,
      title: config.title,
      context,
      signal: task.signal,
    });
  } catch (error) {
    logger.logErrorDetail("[runTextCommand]", error);
  } finally {
    task.cleanup();
  }
}
