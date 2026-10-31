import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { AmplenoteAuthError } from "../lib/mcp";

export { isConnectionError } from "../lib/mcp";

export default function ConnectionErrorView(props: { error: unknown; onRetry: () => void; isLoading?: boolean }) {
  const markdown =
    props.error instanceof AmplenoteAuthError
      ? `## Check Your MCP Token

Amplenote rejected the MCP token.

1. In Amplenote, open the MCP server settings and copy the token.
2. Paste it into this extension's preferences.
3. Choose **Retry**.`
      : `## Start Amplenote's MCP Server

Raycast can't reach Amplenote's local MCP server.

1. Open the Amplenote desktop app.
2. In its settings, turn on the MCP server and copy the token.
3. Paste the token into this extension's preferences. If the server runs on a different address, update the server URL there too.
4. Choose **Retry**.

Amplenote must stay open while you use this extension.`;

  return (
    <Detail
      isLoading={props.isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={() => void openExtensionPreferences()}
          />
        </ActionPanel>
      }
    />
  );
}
