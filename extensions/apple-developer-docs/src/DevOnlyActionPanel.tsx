import { Action, ActionPanel, environment, Icon, showToast, Toast } from "@raycast/api";
import { clear } from "./hooks/useSearchedResults";

export default function DevOnlyActionPanel() {
  async function handleClear() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Clearing searched results",
    });

    try {
      await clear();
      toast.style = Toast.Style.Success;
      toast.title = "Cleared searched results";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed clearing searched results";
      toast.message = error instanceof Error ? error.message : undefined;
      console.error("Failed clearing searched results", error);
    }
  }

  return environment.isDevelopment ? (
    <ActionPanel.Section title="Development">
      <Action icon={Icon.Trash} title="Clear Searched Results" onAction={handleClear} />
    </ActionPanel.Section>
  ) : null;
}
