import { LaunchProps, Toast, open, showHUD, showToast } from "@raycast/api";
import { parseNaturalLanguageTask } from "./natural-language";
import { createTaskNote, isMultipleVaultMode, naturalLanguageDateTarget, obsidianUrl, preferences } from "./tasknotes";

export default async function Command(props: LaunchProps<{ arguments: Arguments.QuickAddTask }>) {
  const text = props.arguments.text.trim();
  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Task text is required" });
    return;
  }

  try {
    const vaultName = inlineVaultName();
    const defaultDateTarget = await naturalLanguageDateTarget(vaultName);
    const task = await createTaskNote({
      ...parseNaturalLanguageTask(text, new Date(), { defaultDateTarget }),
      vaultName,
    });

    await showHUD(`Created task: ${task.title}`);

    if (props.launchContext && typeof props.launchContext === "object" && "open" in props.launchContext) {
      await open(obsidianUrl(task));
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not create task",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function inlineVaultName() {
  if (!isMultipleVaultMode()) return undefined;

  const vaultName = preferences().defaultQuickAddVault;
  if (!vaultName) {
    throw new Error("Set Default Quick Add Vault in preferences, or use Quick Add Task to Vault.");
  }

  return vaultName;
}
