import { LaunchProps, Toast, open, showHUD, showToast } from "@raycast/api";
import { parseNaturalLanguageTask } from "./natural-language";
import {
  createTaskNote,
  defaultVaultName,
  isMultipleVaultMode,
  naturalLanguageDateTarget,
  obsidianUrl,
} from "./tasknotes";

export default async function Command(props: LaunchProps<{ arguments: Arguments.QuickAddTask }>) {
  const text = props.arguments.text.trim();
  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Task text is required" });
    return;
  }

  try {
    const vaultName = await inlineVaultName();
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

async function inlineVaultName() {
  if (!isMultipleVaultMode()) return undefined;

  const vaultName = await defaultVaultName();
  if (!vaultName) {
    throw new Error("Choose a default vault with Switch Default Vault before using inline Quick Add.");
  }

  return vaultName;
}
