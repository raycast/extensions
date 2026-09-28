import {
  Action,
  ActionPanel,
  Icon,
  LaunchType,
  launchCommand,
  openExtensionPreferences,
} from "@raycast/api"

import { apiKeysUrl } from "../lib/urls"

/** The two ways in: approve in the browser, or paste a key. */
export function ConnectActions({ origin }: { origin: string }) {
  return (
    <ActionPanel>
      <Action
        title="Connect Account"
        icon={Icon.Person}
        onAction={() =>
          launchCommand({ name: "connect", type: LaunchType.UserInitiated })
        }
      />
      <Action
        title="Paste an API Key Instead"
        icon={Icon.Key}
        onAction={openExtensionPreferences}
      />
      <Action.OpenInBrowser
        title="Open Settings → API Keys"
        url={apiKeysUrl(origin)}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "k" },
          Windows: { modifiers: ["ctrl", "shift"], key: "k" },
        }}
      />
    </ActionPanel>
  )
}
