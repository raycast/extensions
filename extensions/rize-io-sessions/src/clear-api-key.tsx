import { Action, ActionPanel, Detail } from "@raycast/api";
import { clearApiKey } from "./api-key";

export default function ClearApiKeyCommand() {
  const handleClearApiKey = async () => {
    await clearApiKey();
    await showToast({ title: "API key cleared successfully" });
  };

  return (
    <Detail
      markdown="## Clear Rize.io API Key"
      actions={
        <ActionPanel>
          <Action
            title="Clear API Key"
            onAction={handleClearApiKey}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
    />
  );
}
