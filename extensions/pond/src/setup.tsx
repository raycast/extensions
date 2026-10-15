import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pondClient } from "./api";
import { escapeMarkdown } from "./save-display";

async function checkConnection() {
  const client = pondClient();
  const [app, library] = await Promise.all([client.appInfo(), client.libraryInfo()]);
  return { version: app.version, library, address: client.baseUrl };
}

export default function SetupPond() {
  const { data, error, isLoading, revalidate } = usePromise(checkConnection, [], { onError: () => undefined });
  const status = isLoading
    ? "Checking connection…"
    : data
      ? `Connected to Pond ${escapeMarkdown(data.version)}`
      : "Connect Pond to Raycast";
  const markdown = `![Pond](pond-icon.png?raycast-width=80&raycast-height=80)

# ${status}

${data ? `Your **${escapeMarkdown(data.library.name)}** library has **${data.library.counts.active.toLocaleString()} saves**. You can search and save from Raycast.` : "Search your library, save web pages, and use Pond with Raycast AI."}

${error ? `**Connection check:** ${escapeMarkdown(error.message)}\n` : ""}
## Setup

1. Open Pond and choose a library. Keep Pond running.
2. In **Pond Settings → General → Raycast**, select **Copy Token**.
3. Open **Extension Preferences** below and paste it into **Local API Token**.
4. Return here and press **⌘R** to check the connection.

The default API address is \`http://127.0.0.1:41610/api/v2\`. Change the port only if you changed it in Pond.

## Native MCP tools

Install **Pond.app** in **/Applications** and open a library at least once. In **Pond Settings → Model Context Protocol**, enable **Search Saves**, **Open in Pond**, or **Export Files** as needed.

Raycast connects to Pond's built-in MCP server through **Ask Pond** or **@pond**. These native tools do not need the Local API Token. After switching libraries, reconnect the MCP server. The connection check above checks the local API only.

Pond 1.0.1 can fail MCP tool discovery with **Custom types cannot be represented in JSON Schema**. This requires a fix in Pond; changing the API token will not resolve it.

## Try it

- **Search Library** to find saves and filter by source, tag, or date.
- **Save URL** to archive a page with optional tags.
- Ask Raycast AI: **@pond find my saved typography references**.
`;
  return (
    <Detail
      navigationTitle="Set up Pond"
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {data ? (
            <Action
              title="Search Library"
              icon={Icon.MagnifyingGlass}
              onAction={() => launchCommand({ name: "search-library", type: LaunchType.UserInitiated })}
            />
          ) : null}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.Open title="Open Pond Settings" icon="pond-icon.png" target="pond://settings" />
          <Action
            title="Check Connection"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action.OpenInBrowser title="Download Pond" url="https://github.com/raphaelsalaja/pond/releases" />
        </ActionPanel>
      }
    />
  );
}
