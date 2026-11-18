import { Action, ActionPanel, Icon, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { SHORTCUTS } from "../constants";
import { AICreatedText, ColorItem, UseColorsSelectionObject } from "../types";

type CreateColorsActionsProps = {
  colorItem: ColorItem;
  selection: UseColorsSelectionObject;
  AItext: AICreatedText;
};

export function CreateColorsActions({ colorItem, selection, AItext }: CreateColorsActionsProps) {
  const { toggleSelection, selectAll, clearSelection } = selection.actions;
  const { anySelected, allSelected, countSelected } = selection.selected;
  const { getIsItemSelected } = selection.helpers;
  const isSelected = getIsItemSelected(colorItem);
  const formattedColor = colorItem.color;

  return (
    <ActionPanel>
      <ActionPanel.Section title="Select Colors">
        <Action
          icon={isSelected ? Icon.Checkmark : Icon.Circle}
          title={isSelected ? `Deselect Color ${formattedColor}` : `Select Color ${formattedColor}`}
          shortcut={SHORTCUTS.TOGGLE_SELECT_COLOR}
          onAction={() => toggleSelection(colorItem)}
        />
        {!allSelected && (
          <Action
            icon={Icon.Checkmark}
            title="Select All Colors"
            shortcut={SHORTCUTS.SELECT_ALL}
            onAction={selectAll}
          />
        )}
        {anySelected && (
          <Action
            icon={Icon.XMarkCircle}
            title="Clear Selection"
            shortcut={SHORTCUTS.CLEAR_SELECTION}
            onAction={clearSelection}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Save Palette">
        {countSelected > 0 && (
          <Action
            icon={Icon.AppWindowGrid3x3}
            title={`Save ${countSelected} Color${countSelected > 1 ? "s" : ""} as Palette`}
            shortcut={SHORTCUTS.SAVE_SELECTED}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "save-color-palette",
                  type: LaunchType.UserInitiated,
                  context: { selectedColors: Array.from(selection.selected.selectedItems), AItext },
                });
              } catch (e) {
                await showFailureToast(e);
              }
            }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
