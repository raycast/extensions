import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Grid,
  Icon,
  launchCommand,
  LaunchType,
  showToast,
} from "@raycast/api";
import { useHistory } from "./history";
import { organizeColorsCommandPreferences } from "./preferences";
import { getFormattedColor } from "./utils";

export default function Command() {
  const { history, remove, clear } = useHistory();

  return (
    <Grid>
      <Grid.EmptyView
        icon={Icon.EyeDropper}
        title="No colors picked yet ¯\_(ツ)_/¯"
        description="Use the Pick Color command to pick some"
        actions={
          <ActionPanel>
            <Action
              icon={Icon.EyeDropper}
              title="Pick Color"
              onAction={async () =>
                await launchCommand({
                  name: "pick-color",
                  type: LaunchType.Background,
                  context: { source: "organize-colors" },
                })
              }
            />
          </ActionPanel>
        }
      />
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
                        remove(historyItem.color);
                        await showToast({ title: "Deleted color" });
                      }
                    }}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Delete All Colors"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Delete All Colors",
                        message: "Do you want to delete all colors from your history?",
                        primaryAction: {
                          title: "Delete All",
                          style: Alert.ActionStyle.Destructive,
                        },
                      });

                      if (confirmed) {
                        clear();
                        await showToast({ title: "Deleted all colors" });
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
