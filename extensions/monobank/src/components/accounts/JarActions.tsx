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
        <Action.OpenInBrowser title="Open Top up Page" url={sendUrl} />
        <Action.CopyToClipboard title="Copy Top up Page URL" icon={Icon.Link} content={sendUrl} />
        <Action.CopyToClipboard
          title="Copy Balance"
          content={jar.balance}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "b" },
            Windows: { modifiers: ["ctrl", "shift"], key: "b" },
          }}
        />
        {!!jar.goal && (
          <Action.CopyToClipboard
            title="Copy Goal"
            content={jar.goal}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "g" },
              Windows: { modifiers: ["ctrl", "shift"], key: "g" },
            }}
          />
        )}
        <Action
          title="Copy Total"
          icon={Icon.CopyClipboard}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "t" },
            Windows: { modifiers: ["ctrl", "shift"], key: "t" },
          }}
          onAction={onCopyTotal}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "d" },
            Windows: { modifiers: ["ctrl", "shift"], key: "d" },
          }}
          onAction={onToggleDetails}
        />
        <Action
          title={!isPinned ? "Pin" : "Unpin"}
          icon={!isPinned ? Icon.Pin : Icon.PinDisabled}
          shortcut={{
            macOS: { key: "p", modifiers: ["cmd", "shift"] },
            Windows: { key: "p", modifiers: ["ctrl", "shift"] },
          }}
          onAction={() => onPin(jar)}
        />
        {isPinned && onRearrange && (
          <>
            {validRearrangeDirections?.up && (
              <Action
                title="Move up in Pinned"
                icon={Icon.ArrowUp}
                shortcut={{
                  macOS: { key: "arrowUp", modifiers: ["cmd", "opt"] },
                  Windows: { key: "arrowUp", modifiers: ["ctrl", "alt"] },
                }}
                onAction={() => onRearrange(jar, "up")}
              />
            )}

            {validRearrangeDirections?.down && (
              <Action
                title="Move Down in Pinned"
                icon={Icon.ArrowDown}
                shortcut={{
                  macOS: { key: "arrowDown", modifiers: ["cmd", "opt"] },
                  Windows: { key: "arrowDown", modifiers: ["ctrl", "alt"] },
                }}
                onAction={() => onRearrange(jar, "down")}
              />
            )}
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
