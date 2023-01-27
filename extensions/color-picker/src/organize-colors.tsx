import { Action, ActionPanel, Alert, confirmAlert, Grid, Icon, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { organizeColorsCommandPreferences } from "./preferences";
import { HistoryItem } from "./types";
import { getFormattedColor } from "./utils";

export default function Command() {
  const [history, setHistory] = useCachedState<HistoryItem[]>("history", []);

  return (
    <Grid>
      {history?.map((historyItem) => {
        const formattedColor = getFormattedColor(historyItem.color);
        return (
          <Grid.Item
            key={formattedColor}
            content={{ color: formattedColor }}
            title={formattedColor}
            subtitle={new Date(historyItem.date).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {organizeColorsCommandPreferences.primaryAction === "copy" ? (
                    <>
                      <Action.CopyToClipboard content={formattedColor} />
                      <Action.Paste content={formattedColor} />
                    </>
                  ) : (
                    <>
                      <Action.Paste content={formattedColor} />
                      <Action.CopyToClipboard content={formattedColor} />
                    </>
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    icon={Icon.Trash}
                    title="Delete Color"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Delete Color",
                        message: "Do you want to delete the color from your history?",
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                        },
                      });
                      if (confirmed) {
                        setHistory((previousHistory) => {
                          return previousHistory.filter(
                            (item) => getFormattedColor(item.color) !== getFormattedColor(historyItem.color)
                          );
                        });
                        await showToast({ title: "Deleted color" });
                      }
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
