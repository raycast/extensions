import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { checkConnection } from "./lib/api";
import { SettingsAction } from "./components/settings-action";
export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(checkConnection);
  return (
    <Detail
      isLoading={isLoading}
      markdown={
        error
          ? `## Connection Failed\n\n${error.message}`
          : data
            ? "## Connected\n\nThe local service is reachable and the API token was accepted.\n\nCredentials are never shown here."
            : "Checking local service…"
      }
      actions={
        <ActionPanel>
          <Action title="Check Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <SettingsAction />
        </ActionPanel>
      }
    />
  );
}
