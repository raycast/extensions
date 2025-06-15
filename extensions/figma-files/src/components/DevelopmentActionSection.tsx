import { Action, ActionPanel, Icon, Toast, environment, showToast } from "@raycast/api";
import { clearFiles } from "../cache";
import { clearVisitedFiles } from "../hooks/useVisitedFiles";

export default function DevelopmentActionSection() {
  async function handleClearCache() {
    const toast = await showToast(Toast.Style.Animated, "Clearing cache");

    try {
      await clearFiles();
      toast.style = Toast.Style.Success;
      toast.title = "Cleared cache";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed clearing cache";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  async function handleClearVisited() {
    const toast = await showToast(Toast.Style.Animated, "Clearing visited files");

    try {
      await clearVisitedFiles();
      toast.style = Toast.Style.Success;
      toast.title = "Cleared visited files";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed clearing visited files";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  return (
    <>
      <ActionPanel.Section title="Advanced">
        <Action icon={Icon.Trash} title="Clear Visited" onAction={handleClearVisited} />
      </ActionPanel.Section>

      {environment.isDevelopment && (
        <ActionPanel.Section title="Development">
          <Action icon={Icon.Trash} title="Clear Cache" onAction={handleClearCache} />
        </ActionPanel.Section>
      )}
    </>
  );
}
