import { Action, ActionPanel, Icon } from "@raycast/api";

/**
 * Action for copying multiple items to the clipboard.
 */
export function CopyToClipboardMenuAction({ contents }: { contents: Action.CopyToClipboard.Props[] }) {
  if (contents.length === 0) {
    return undefined;
  }

  if (contents.length === 1) {
    return (
      <Action.CopyToClipboard
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        {...contents[0]}
        // Add "Copy" to the title because submenu title is skipped
        title={`Copy ${contents[0].title}`}
        // Ignore custom icon if passed, to save original action icon
        icon={Icon.Clipboard}
      />
    );
  }

  return (
    <ActionPanel.Submenu title="Copy to Clipboard" icon={Icon.Clipboard} shortcut={{ modifiers: ["cmd"], key: "c" }}>
      {contents.map((content, index) => (
        <Action.CopyToClipboard key={index} {...content} />
      ))}
    </ActionPanel.Submenu>
  );
}
