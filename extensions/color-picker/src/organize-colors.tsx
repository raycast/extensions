import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getFrontmostApplication,
  getPreferenceValues,
  Grid,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  showToast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import CopyAsSubmenu from "./components/CopyAsSubmenu";
import { EditTitle } from "./components/EditTitle";
import { useHistory } from "./history";
import { useColorsSelection } from "./hooks/useColorsSelection";
import { HistoryItem, UseColorsSelectionObject } from "./types";
import { COPY_FORMATS, copySelectedColors, getFormattedColor, getPreviewColor } from "./utils";

const preferences: Preferences.OrganizeColors = getPreferenceValues();

export default function Command() {
  const { history } = useHistory();
  const { selection } = useColorsSelection(history);

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
        if (!historyItem) {
          return null;
        }

        const formattedColor = getFormattedColor(historyItem.color);
        const previewColor = getPreviewColor(historyItem.color);

        const isSelected = selection.helpers.getIsItemSelected(historyItem);
        const content = isSelected
          ? { source: Icon.CircleFilled, tintColor: { light: previewColor, dark: previewColor, adjustContrast: false } }
          : { color: { light: previewColor, dark: previewColor, adjustContrast: false } };

        return (
          <Grid.Item
            key={formattedColor}
            content={content}
            title={`${isSelected ? "✓ " : ""}${formattedColor} ${historyItem.title ?? ""}`}
            subtitle={new Date(historyItem.date).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            actions={<Actions item={historyItem} selection={selection} />}
          />
        );
      })}
    </Grid>
  );
}

function Actions({ item, selection }: { item: HistoryItem; selection: UseColorsSelectionObject<HistoryItem> }) {
  const { remove, clear, edit } = useHistory();
  const { data: frontmostApp } = usePromise(getFrontmostApplication, []);

  const { toggleSelection, selectAll, clearSelection } = selection.actions;
  const { anySelected, allSelected, selectedItems, countSelected } = selection.selected;
  const isSelected = selection.helpers.getIsItemSelected(item);

  const color = item.color;
  const formattedColor = getFormattedColor(color);

  return (
    <ActionPanel>
      <ActionPanel.Section title={`Color ${formattedColor}`}>
        {preferences.primaryAction === "copy" ? (
          <>
            <Action.CopyToClipboard content={formattedColor} title={`Copy Color ${formattedColor}`} />
            <Action.Paste
              title={`Paste to ${frontmostApp?.name || "Active App"}`}
              content={formattedColor}
              icon={frontmostApp ? { fileIcon: frontmostApp.path } : Icon.Clipboard}
            />
          </>
        ) : (
          <>
            <Action.Paste
              title={`Paste to ${frontmostApp?.name || "Active App"}`}
              content={formattedColor}
              icon={frontmostApp ? { fileIcon: frontmostApp.path } : Icon.Clipboard}
            />
            <Action.CopyToClipboard content={formattedColor} />
          </>
        )}
        <CopyAsSubmenu color={color} />
        <Action.Push
          target={<EditTitle item={item} onEdit={edit} />}
          title="Edit Title"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Multiple Colors">
        {countSelected > 0 && (
          <ActionPanel.Submenu
            title="Copy Selected Colors"
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          >
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={selection.selected.selectedItems.map((item) => getFormattedColor(item.color)).join(";")}
            />
            {COPY_FORMATS.map(({ format, title, icon }) => (
              <Action.CopyToClipboard
                key={format}
                title={title}
                content={copySelectedColors(selectedItems, format)}
                icon={icon}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        <Action
          icon={isSelected ? Icon.Checkmark : Icon.Circle}
          title={isSelected ? `Deselect Color ${formattedColor}` : `Select Color ${formattedColor}`}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => toggleSelection(item)}
        />
        {!allSelected && (
          <Action
            icon={Icon.Checkmark}
            title="Select All Colors"
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={selectAll}
          />
        )}
        {anySelected && (
          <Action
            icon={Icon.XMarkCircle}
            title="Clear Selection"
            shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
            onAction={clearSelection}
          />
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
              rememberUserChoice: true,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
            });

            if (confirmed) {
              remove(item.color);
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
