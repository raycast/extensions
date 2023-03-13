import { Action, ActionPanel, Clipboard, getSelectedText, Icon, showToast, Toast } from "@raycast/api";
import { QueryHook } from "../hooks/useQuery";

export const getLoadActionSection = (callback: (arg0: string) => void) => (
  <ActionPanel.Section title="Load">
    <Action
      title="Load Selected From Frontmost"
      shortcut={{ modifiers: ["cmd"], key: "l" }}
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
