import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Grid,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  showToast,
} from "@raycast/api";
import { useHistory } from "./history";
import { getFormattedColor } from "./utils";
import { HistoryItem } from "./types";
import { EditTitle } from "./components/edit-title";
import { showFailureToast } from "@raycast/utils";

const preferences: Preferences.OrganizeColors = getPreferenceValues();

export default function Command() {
  const { history, remove, clear, edit } = useHistory();

  function Actions({
    formattedColor,
    historyItem,
    onEdit,
  }: {
    formattedColor: string | undefined;
    historyItem: HistoryItem;
    onEdit: (item: HistoryItem) => Promise<void>;
  }) {
    const color = formattedColor ?? "";
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {preferences.primaryAction === "copy" ? (
            <>
              <Action.CopyToClipboard content={color} />
              <Action.Paste content={color} />
            </>
          ) : (
            <>
              <Action.Paste content={color} />
              <Action.CopyToClipboard content={color} />
            </>
          )}
          <Action.Push
            target={<EditTitle item={historyItem} onEdit={onEdit} />}
            title="Edit Title"
            shortcut={Keyboard.Shortcut.Common.Edit}
          />
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
    );
  }

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
              onAction={async () => {
                try {
                  await launchCommand({
                    name: "pick-color",
                    type: LaunchType.Background,
                    context: { source: "organize-colors" },
                  });
                } catch (e) {
                  await showFailureToast(e);
                  return e;
                }
              }}
            />
          </ActionPanel>
        }
      />
      {history?.map((historyItem) => {
        const formattedColor = getFormattedColor(historyItem.color) || "";
        return (
          <Grid.Item
            key={formattedColor}
            content={{
              color: { light: formattedColor, dark: formattedColor, adjustContrast: false },
              tooltip: historyItem.title,
            }}
            title={`${formattedColor} ${historyItem.title ?? ""}`}
            subtitle={new Date(historyItem.date).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            actions={
              <Actions
                formattedColor={formattedColor}
                historyItem={historyItem}
                onEdit={async (editedHistoryItem) => {
                  edit(editedHistoryItem);
                }}
              />
            }
          />
        );
      })}
    </Grid>
  );
}
