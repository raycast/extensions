import { Action, ActionPanel, getSelectedText, Icon, showToast, Toast } from "@raycast/api";
import { Record } from "../hooks/useHistory";

export const getLoadActionSection = (record: Record, callback: (_arg0: string) => void) => (
  <ActionPanel.Section title="Load">
    <Action
      title="Load Original"
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      icon={Icon.Repeat}
      onAction={() => {
        if (record.result.original) {
          callback(record.result.original);
        }
      }}
    />
    <Action
      title="Load Translation"
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      icon={Icon.Repeat}
      onAction={() => {
        if (record.result.text) {
          callback(record.result.text);
        }
      }}
    />
    <Action
      title="Load Selected From Frontmost"
      shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
      icon={Icon.ArrowDown}
      onAction={async () => {
        try {
          const selectedText = (await getSelectedText()).trim();
          if (selectedText.length > 1) {
            callback(selectedText);
            await showToast({
              style: Toast.Style.Success,
              title: "Selected text loaded!",
            });
          }
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Selected text couldn't load",
            message: String(error),
          });
        }
      }}
    />
  </ActionPanel.Section>
);
