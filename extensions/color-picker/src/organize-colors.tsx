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
  const { history } = useHistory();

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
        const formattedColor = getFormattedColor(historyItem.color);
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
            actions={<Actions historyItem={historyItem} />}
          />
        );
      })}
    </Grid>
  );
}

function Actions({ historyItem }: { historyItem: HistoryItem }) {
  const { remove, clear, edit } = useHistory();

  const color = historyItem.color;
  const formattedColor = getFormattedColor(color);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {preferences.primaryAction === "copy" ? (
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
        <Action.Push
          target={<EditTitle item={historyItem} onEdit={edit} />}
          title="Edit Title"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title={`Copy as HEX`} content={getFormattedColor(color, "hex")} />
        <Action.CopyToClipboard title={`Copy as lowercased HEX`} content={getFormattedColor(color, "hex-lower-case")} />
        <Action.CopyToClipboard title={`Copy as RGB`} content={getFormattedColor(color, "rgba")} />
        <Action.CopyToClipboard
          title={`Copy as RGB percentage`}
          content={getFormattedColor(color, "rgba-percentage")}
        />
        <Action.CopyToClipboard title={`Copy as HSL`} content={getFormattedColor(color, "hsla")} />
        <Action.CopyToClipboard title={`Copy as HSV`} content={getFormattedColor(color, "hsva")} />
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
