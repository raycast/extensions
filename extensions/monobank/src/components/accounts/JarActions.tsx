import { Action, ActionPanel, Icon } from "@raycast/api";
import { Jar } from "../../types";

export default function JarActions(props: {
  jar: Jar;
  isPinned: boolean;
  validRearrangeDirections?: { up: boolean; down: boolean };
  onPin: (account: Jar) => void;
  onRearrange?: (account: Jar, direction: "up" | "down") => void;
  onToggleDetails: () => void;
  onCopyTotal: () => void;
}) {
  const { jar, isPinned, validRearrangeDirections, onPin, onRearrange, onToggleDetails, onCopyTotal } = props;

  const sendUrl = `https://send.monobank.ua/${jar.sendId}`;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Top Up Page" url={sendUrl} />
        <Action.CopyToClipboard title="Copy Top Up Page URL" icon={Icon.Link} content={sendUrl} />
        <Action.CopyToClipboard
          title="Copy Balance"
          content={jar.balance}
          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
        />
        {!!jar.goal && (
          <Action.CopyToClipboard
            title="Copy Goal"
            content={jar.goal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          />
        )}
        <Action
          title="Copy Total"
          icon={Icon.CopyClipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          onAction={onCopyTotal}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={onToggleDetails}
        />
        <Action
          title={!isPinned ? "Pin" : "Unpin"}
          icon={!isPinned ? Icon.Pin : Icon.PinDisabled}
          shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
          onAction={() => onPin(jar)}
        />
        {isPinned && onRearrange && (
          <>
            {validRearrangeDirections?.up && (
              <Action
                title="Move Up in Pinned"
                icon={Icon.ArrowUp}
                shortcut={{ key: "arrowUp", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(jar, "up")}
              />
            )}

            {validRearrangeDirections?.down && (
              <Action
                title="Move Down in Pinned"
                icon={Icon.ArrowDown}
                shortcut={{ key: "arrowDown", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(jar, "down")}
              />
            )}
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
