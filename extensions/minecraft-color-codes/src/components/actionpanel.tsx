import { Action, ActionPanel, Icon, Keyboard, getPreferenceValues, showToast } from "@raycast/api";

export function generateActionPanel({
  setPrefix,
  chatCode,
  chatCodeEscaped,
  hexCode,
}: {
  setPrefix?: (prefix: string) => void;

  chatCode: string;
  chatCodeEscaped: string;
  hexCode?: string;
}) {
  const prefs = getPreferenceValues<Preferences>();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard content={chatCode} title="Copy Chat Code" shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard
          content={chatCodeEscaped}
          title="Copy Escaped Chat Code"
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        {hexCode && (
          <Action.CopyToClipboard
            content={hexCode}
            title="Copy Hex Code"
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "h" },
              Windows: { modifiers: ["ctrl", "shift"], key: "h" },
            }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          icon={Icon.Key}
          title="Use Primary Prefix"
          onAction={() => {
            setPrefix?.(prefs.prefix1);

            showToast({
              title: `Prefix changed to ${prefs.prefix1}`,
            });
          }}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "1" },
            Windows: { modifiers: ["ctrl", "shift"], key: "1" },
          }}
        />
        <Action
          icon={Icon.Key}
          title="Use Secondary Prefix"
          onAction={() => {
            setPrefix?.(prefs.prefix2);

            showToast({
              title: `Prefix changed to ${prefs.prefix2}`,
            });
          }}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "2" },
            Windows: { modifiers: ["ctrl", "shift"], key: "2" },
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
