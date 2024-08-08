import { Action, ActionPanel, Cache, getPreferenceValues, showToast } from "@raycast/api";

export function generateActionPanel({
  cache,
  setPrefix,
  chatCode,
  chatCodeEscaped,
  hexCode,
}: {
  cache?: Cache;
  setPrefix?: (prefix: string) => void;

  chatCode: string;
  chatCodeEscaped: string;
  hexCode?: string;
}) {
  const prefs = getPreferenceValues<Preferences>();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Use primary prefix"
          onAction={() => {
            cache?.set("prefix", prefs.prefix1);
            setPrefix?.(prefs.prefix1);

            showToast({
              title: `Prefix changed to ${prefs.prefix1}`,
            });
          }}
          shortcut={{
            modifiers: ["cmd", "shift"],
            key: "1",
          }}
        />
        <Action
          title="Use secondary prefix"
          onAction={() => {
            cache?.set("prefix", prefs.prefix2);
            setPrefix?.(prefs.prefix2);

            showToast({
              title: `Prefix changed to ${prefs.prefix2}`,
            });
          }}
          shortcut={{
            modifiers: ["cmd", "shift"],
            key: "2",
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard content={chatCode} title="Copy Chat Code" />
        <Action.CopyToClipboard content={chatCodeEscaped} title="Copy Escaped Chat Code" />
        {hexCode && <Action.CopyToClipboard content={hexCode} title="Copy Hex Code" />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
