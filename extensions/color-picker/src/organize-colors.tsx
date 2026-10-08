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
import MultipleColorActions from "./components/MultipleColorActions";
import { EditTitle } from "./components/EditTitle";
import { GroupForm } from "./components/GroupForm";
import { useColorsSelection } from "./hooks/useColorsSelection";
import { formatGroup, getGroups, isRenameTaken } from "./lib/groups";
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
  const favoriteHistory = history?.filter((item) => item.isFavorite && !item.group) ?? [];
  const regularHistory = history?.filter((item) => !item.isFavorite && !item.group) ?? [];
  const groups = getGroups(history ?? []);
  const groupSections = groups.map((group) => ({
    title: formatGroup(group),
    history: history?.filter((item) => item.group === group) ?? [],
  }));

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
        <ListHistorySection
          title="Favorites"
          history={favoriteHistory}
          groups={groups}
          selectMode={selectMode}
          selection={selection}
        />
        {groupSections.map((section) => (
          <ListHistorySection
            key={section.title}
            {...section}
            groups={groups}
            selectMode={selectMode}
            selection={selection}
          />
        ))}
        <ListHistorySection
          title="History"
          history={regularHistory}
          groups={groups}
          selectMode={selectMode}
          selection={selection}
        />
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
      <GridHistorySection
        title="Favorites"
        history={favoriteHistory}
        groups={groups}
        selectMode={selectMode}
        selection={selection}
      />
      {groupSections.map((section) => (
        <GridHistorySection
          key={section.title}
          {...section}
          groups={groups}
          selectMode={selectMode}
          selection={selection}
        />
      ))}
      <GridHistorySection
        title="History"
        history={regularHistory}
        groups={groups}
        selectMode={selectMode}
        selection={selection}
      />
    </Grid>
  );
}

type HistorySectionProps = {
  title: string;
  history: HistoryItem[];
  groups: string[];
  selectMode: SelectMode;
  selection: UseColorsSelectionObject<HistoryItem>;
};

function GridHistorySection({ title, history, groups, selectMode, selection }: HistorySectionProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <Grid.Section title={title} subtitle={String(history.length)}>
      {history.map((historyItem) => {
        const formattedColor = getFormattedColor(historyItem.color);
        const previewColor = getPreviewColor(historyItem.color);
        const color = { light: previewColor, dark: previewColor, adjustContrast: false };

        return (
          <Grid.Item
            key={`${title}-${historyItem.date}-${formattedColor}`}
            content={historyItem.title ? { value: { color }, tooltip: historyItem.title } : { color }}
            title={`${getFavoriteMark(historyItem)}${formattedColor} ${historyItem.title ?? ""}`}
            subtitle={new Date(historyItem.date).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            actions={
              <Actions
                historyItem={historyItem}
                sectionHistory={history}
                groups={groups}
                selectMode={selectMode}
                selection={selection}
              />
            }
          />
        );
      })}
    </Grid.Section>
  );
}

function ListHistorySection({ title, history, groups, selectMode, selection }: HistorySectionProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <List.Section title={title} subtitle={String(history.length)}>
      {history.map((historyItem) => {
        const formattedColor = getFormattedColor(historyItem.color);
        const previewColor = getPreviewColor(historyItem.color);
        const isSelected = selection.helpers.getIsItemSelected(historyItem);

        return (
          <List.Item
            key={`${title}-${historyItem.date}-${formattedColor}`}
            icon={getIcon(previewColor)}
            title={`${isSelected ? "✓ " : ""}${getFavoriteMark(historyItem)}${formattedColor}${historyItem.title ? ` ${historyItem.title}` : ""}`}
            subtitle={new Date(historyItem.date).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            actions={
              <Actions
                historyItem={historyItem}
                sectionHistory={history}
                groups={groups}
                selectMode={selectMode}
                selection={selection}
              />
            }
          />
        );
      })}
    </List.Section>
  );
}

function getFavoriteMark(historyItem: HistoryItem) {
  return historyItem.isFavorite && historyItem.group ? "★ " : "";
}

type ActionsProps = {
  historyItem: HistoryItem;
  sectionHistory: HistoryItem[];
  groups: string[];
  selectMode: SelectMode;
  selection: UseColorsSelectionObject<HistoryItem>;
};

function Actions({ historyItem, sectionHistory, groups, selectMode, selection }: ActionsProps) {
  const {
    history,
    remove,
    clear,
    edit,
    addToFavorites,
    removeFromFavorites,
    moveFavorite,
    setGroup,
    renameGroup,
    deleteGroup,
  } = useHistory();
  const { data: frontmostApp } = usePromise(async () => {
    try {
      return await getFrontmostApplication();
    } catch {
      return null;
    }
  }, []);

  const color = historyItem.color;
  const formattedColor = getFormattedColor(color);
  const favoriteHistory = history?.filter((item) => item.isFavorite && !item.group) ?? [];
  const favoriteIndex = favoriteHistory.findIndex((item) => getFormattedColor(item.color) === formattedColor);
  const canMoveFavoriteUp = favoriteIndex > 0;
  const canMoveFavoriteDown = favoriteIndex !== -1 && favoriteIndex < favoriteHistory.length - 1;
  const { countSelected, selectedItems } = selection.selected;
  const targets = selectMode === "multi" && countSelected > 0 ? selectedItems : [historyItem];
  const targetColors = targets.map((item) => item.color);
  const targetsLabel = targets.length === 1 ? "Color" : `${targets.length} Colors`;
  const group = historyItem.group;
  const hasSubgroups = Boolean(group && groups.some((name) => name.startsWith(`${group}/`)));

  const moveToGroup = async (name: string) => {
    setGroup(targetColors, name);
    await showToast({ title: `Moved to ${formatGroup(name)}` });
  };

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

      <ActionPanel.Section title="Organize">
        <Action
          icon={historyItem.isFavorite ? Icon.StarDisabled : Icon.Star}
          title={historyItem.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={async () => {
            if (historyItem.isFavorite) {
              removeFromFavorites(historyItem.color);
              await showToast({ title: "Removed from favorites" });
            } else {
              addToFavorites(historyItem.color);
              await showToast({ title: "Added to favorites" });
            }
          }}
        />
        {canMoveFavoriteUp && (
          <Action
            icon={Icon.ArrowUp}
            title="Move Favorite up"
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
            onAction={async () => {
              moveFavorite(historyItem.color, "up");
              await showToast({ title: "Moved favorite up" });
            }}
          />
        )}
        {canMoveFavoriteDown && (
          <Action
            icon={Icon.ArrowDown}
            title="Move Favorite Down"
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
            onAction={async () => {
              moveFavorite(historyItem.color, "down");
              await showToast({ title: "Moved favorite down" });
            }}
          />
        )}
        <ActionPanel.Submenu
          icon={Icon.Folder}
          title={`Move ${targetsLabel} to Group`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
        >
          {groups
            .filter((name) => targets.some((item) => item.group !== name))
            .map((name) => (
              <Action key={name} title={formatGroup(name)} onAction={() => moveToGroup(name)} />
            ))}
          <Action.Push
            icon={Icon.Plus}
            title="New Group"
            target={<GroupForm submitTitle="Move to Group" onSubmit={moveToGroup} />}
          />
        </ActionPanel.Submenu>
        {targets.some((item) => item.group) && (
          <Action
            icon={Icon.XMarkCircle}
            title={`Remove ${targetsLabel} from Group`}
            onAction={async () => {
              setGroup(targetColors, undefined);
              await showToast({ title: "Removed from group" });
            }}
          />
        )}
      </ActionPanel.Section>

      {group && (
        <ActionPanel.Section title="Group">
          <ActionPanel.Submenu icon={Icon.CopyClipboard} title="Copy Group">
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={sectionHistory.map((item) => getFormattedColor(item.color)).join(";")}
            />
            {COPY_FORMATS.map(({ format, title, icon }) => (
              <Action.CopyToClipboard
                key={format}
                title={title}
                content={copySelectedColors(sectionHistory, format)}
                icon={icon}
              />
            ))}
          </ActionPanel.Submenu>
          <Action.Push
            icon={Icon.Pencil}
            title="Rename Group"
            target={
              <GroupForm
                submitTitle="Rename Group"
                defaultValue={group}
                validate={(newGroup) =>
                  isRenameTaken(groups, group, newGroup) ? "A group with this name already exists" : undefined
                }
                onSubmit={async (newGroup) => {
                  renameGroup(group, newGroup);
                  await showToast({ title: `Renamed to ${formatGroup(newGroup)}` });
                }}
              />
            }
          />
          <Action
            icon={Icon.Trash}
            title="Delete Group"
            style={Action.Style.Destructive}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Delete Group",
                message: `Delete ${formatGroup(group)}${hasSubgroups ? " and its subgroups" : ""}? The colors stay in your history.`,
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                },
              });

              if (confirmed) {
                deleteGroup(group);
                await showToast({ title: "Deleted group" });
              }
            }}
          />
        </ActionPanel.Section>
      )}

      {selectMode === "multi" && <MultipleColorActions item={historyItem} selection={selection} />}

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
