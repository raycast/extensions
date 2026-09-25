import { Action, ActionPanel, Icon } from "@raycast/api";
import { HistoryItem, UseColorsSelectionObject } from "../lib/types";
import { COPY_FORMATS, copySelectedColors, getColor, getFormattedColor } from "../lib/utils";

type MultipleColorActionsProps<T extends HistoryItem | string> = {
  item: T;
  selection: UseColorsSelectionObject<T>;
  onCopySelected?: () => void;
};

export default function MultipleColorActions<T extends HistoryItem | string>({
  item,
  selection,
  onCopySelected,
}: MultipleColorActionsProps<T>) {
  const { toggleSelection, selectAll, clearSelection } = selection.actions;
  const { anySelected, allSelected, selectedItems, countSelected } = selection.selected;
  const isSelected = selection.helpers.getIsItemSelected(item);
  const formattedColor = getFormattedColor(getColor(item));

  return (
    <ActionPanel.Section title="Multiple Colors">
      {countSelected > 0 && (
        <ActionPanel.Submenu
          title="Copy Selected Colors"
          icon={Icon.CopyClipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        >
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={selectedItems.map((selectedItem) => getFormattedColor(getColor(selectedItem))).join(";")}
            onCopy={onCopySelected}
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
  );
}
