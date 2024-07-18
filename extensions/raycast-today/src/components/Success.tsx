import { Action, ActionPanel, Detail } from "@raycast/api";

export default function Success() {
  return (
    <Detail
      markdown={`
# 🎉 New Database Added!

## What's next?

- Press ↵ the main view of all your tasks accross your databases

- Press ⌘ ⇧ ↵ the main view of all your tasks accross your databases
`}
      actions={
        <ActionPanel title="#1 in raycast/extensions">
          <Action.Open title="ToDay" target="raycast://extensions/julienR2/raycast-today/index" />
          <Action.OpenInBrowser url="https://github.com/raycast/extensions/pull/1" />
          <Action.CopyToClipboard
            title="Copy Pull Request Number"
            content="#1"
            shortcut={{ key: "enter", modifiers: ["shift", "cmd"] }}
          />
        </ActionPanel>
      }
    />
  );
}
