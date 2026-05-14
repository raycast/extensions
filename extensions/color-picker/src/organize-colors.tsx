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
  List,
  showToast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import CopyAsSubmenu from "./components/CopyAsSubmenu";
import { EditTitle } from "./components/EditTitle";
import { useColorsSelection } from "./hooks/useColorsSelection";
import { useHistory } from "./lib/history";
import { HistoryItem, SelectMode, UseColorsSelectionObject } from "./lib/types";
import { COPY_FORMATS, copySelectedColors, getFormattedColor, getIcon, getPreviewColor } from "./lib/utils";

const preferences: Preferences.OrganizeColors = getPreferenceValues();

const EMPTY_VIEW_TITLE = "No colors picked yet ¯\\_(ツ)_/¯";
const EMPTY_VIEW_DESCRIPTION = "Use the Pick Color command to pick some";

const PickColorAction = () => (
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
);

export default function Command() {
  const { history } = useHistory();
  const [selectMode, setSelectMode] = useState<SelectMode>("single");
  // Stable reference so useColorsSelection's cleanup effect doesn't re-run every render.
  // Combine date + formattedColor so distinct history entries that format to the same color
  // (e.g. legacy data with duplicate picks) get distinct selection keys.
  const getItemKey = useCallback((item: HistoryItem) => `${item.date}-${getFormattedColor(item.color)}`, []);
  const { selection } = useColorsSelection<HistoryItem>(history ?? [], getItemKey);

  if (selectMode === "multi") {
    return (
      <List
        searchBarAccessory={
          <List.Dropdown
            tooltip="Switch Select Mode"
            value={selectMode}
            onChange={(v) => setSelectMode(v as SelectMode)}
          >
            <List.Dropdown.Item title="Single-Select Mode" value="single" />
            <List.Dropdown.Item title="Multi-Select Mode" value="multi" />
          </List.Dropdown>
        }
      >
        <List.EmptyView
          icon={Icon.EyeDropper}
          title={EMPTY_VIEW_TITLE}
          description={EMPTY_VIEW_DESCRIPTION}
          actions={
            <ActionPanel>
              <PickColorAction />
            </ActionPanel>
          }
        />
        {history?.map((historyItem) => {
          const formattedColor = getFormattedColor(historyItem.color);
          const previewColor = getPreviewColor(historyItem.color);
          const isSelected = selection.helpers.getIsItemSelected(historyItem);

          return (
            <List.Item
              key={`${historyItem.date}-${formattedColor}`}
              icon={getIcon(previewColor)}
              title={`${isSelected ? "✓ " : ""}${formattedColor}${historyItem.title ? ` ${historyItem.title}` : ""}`}
              subtitle={new Date(historyItem.date).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              actions={<Actions historyItem={historyItem} selectMode={selectMode} selection={selection} />}
            />
          );
        })}
      </List>
    );
  }

  return (
    <Grid
      searchBarAccessory={
        <Grid.Dropdown tooltip="Switch Select Mode" value={selectMode} onChange={(v) => setSelectMode(v as SelectMode)}>
          <Grid.Dropdown.Item title="Single-Select Mode" value="single" />
          <Grid.Dropdown.Item title="Multi-Select Mode" value="multi" />
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        icon={Icon.EyeDropper}
        title={EMPTY_VIEW_TITLE}
        description={EMPTY_VIEW_DESCRIPTION}
        actions={
          <ActionPanel>
            <PickColorAction />
          </ActionPanel>
        }
      />
      {history?.map((historyItem) => {
        const formattedColor = getFormattedColor(historyItem.color);
        const previewColor = getPreviewColor(historyItem.color);
        const color = { light: previewColor, dark: previewColor, adjustContrast: false };

        return (
          <Grid.Item
            key={`${historyItem.date}-${formattedColor}`}
            content={historyItem.title ? { value: { color }, tooltip: historyItem.title } : { color }}
            title={`${formattedColor} ${historyItem.title ?? ""}`}
            subtitle={new Date(historyItem.date).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            actions={<Actions historyItem={historyItem} selectMode={selectMode} selection={selection} />}
          />
        );
      })}
    </Grid>
  );
}

type ActionsProps = {
  historyItem: HistoryItem;
  selectMode: SelectMode;
  selection: UseColorsSelectionObject<HistoryItem>;
};

function Actions({ historyItem, selectMode, selection }: ActionsProps) {
  const { remove, clear, edit } = useHistory();
  const { data: frontmostApp } = usePromise(async () => {
    try {
      return await getFrontmostApplication();
    } catch {
      return null;
    }
  }, []);

  const { toggleSelection, selectAll, clearSelection } = selection.actions;
  const { anySelected, allSelected, selectedItems, countSelected } = selection.selected;
  const isSelected = selection.helpers.getIsItemSelected(historyItem);

  const color = historyItem.color;
  const formattedColor = getFormattedColor(color);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {preferences.primaryAction === "copy" ? (
          <>
            <Action.CopyToClipboard content={formattedColor} />
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
          target={<EditTitle item={historyItem} onEdit={edit} />}
          title="Edit Title"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
        />
      </ActionPanel.Section>

      {selectMode === "multi" && (
        <ActionPanel.Section title="Multiple Colors">
          {countSelected > 0 && (
            <ActionPanel.Submenu
              title="Copy Selected Colors"
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            >
              <Action.CopyToClipboard
                title="Copy to Clipboard"
                content={selectedItems.map((item) => getFormattedColor(item.color)).join(";")}
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
            onAction={() => toggleSelection(historyItem)}
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
      )}

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
