import { Action, ActionPanel, Icon, Toast, showToast } from "@raycast/api";
import { clearFiles } from "../cache";
import { clearVisitedFiles } from "../hooks/useVisitedFiles";

export default function AdvancedActionSection(props: {
  revalidateVisitedFiles: () => void;
  revalidateAllFiles: () => void;
}) {
  const { revalidateVisitedFiles, revalidateAllFiles } = props;
  async function handleClearCache() {
    const toast = await showToast(Toast.Style.Animated, "Clearing cache");

    try {
      await clearFiles();
      revalidateAllFiles();
      toast.style = Toast.Style.Success;
      toast.title = "Cleared cache";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed clearing cache";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  async function handleClearVisited() {
    const toast = await showToast(Toast.Style.Animated, "Clearing recent files");

    try {
      await clearVisitedFiles();
      revalidateVisitedFiles();
      toast.style = Toast.Style.Success;
      toast.title = "Cleared recent files";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed clearing recent files";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  return (
    <ActionPanel.Section title="Advanced">
      <Action icon={Icon.DeleteDocument} title="Clear Recent Files" onAction={handleClearVisited} />
      <Action icon={Icon.Trash} title="Clear All Cache" onAction={handleClearCache} />
    </ActionPanel.Section>
  );
}
