import { AI, Action, ActionPanel, Grid, Icon, LaunchProps, LaunchType, launchCommand } from "@raycast/api";
import { showFailureToast, useAI } from "@raycast/utils";
import { useMemo } from "react";
import CopyAsSubmenu from "./components/CopyAsSubmenu";
import { addToHistory } from "./history";
import { useColorsSelection } from "./hooks/useColorsSelection";
import { ColorItem, GenerateColorsActionsProps } from "./types";
import { getFormattedColor, getPreviewColor } from "./utils";

export default function GenerateColors(props: LaunchProps<{ arguments: Arguments.GenerateColors }>) {
  const { prompt } = props.arguments;

  const { data, isLoading } = useAI(
    `Generate colors based on a prompt.

Please follow these rules:
- You MUST return an JSON array of HEX colors without any other characters. It should be PARSABLE and MINIFIED.
- Return an empty JSON array if it's not possible to generate colors.

Examples:
- ["#66D3BB","#7EDDC6","#96E7D1","#AEEFDB","#C6F9E6"]
- ["#0000CD","#0000FF","#1E90FF"]
- ["#FF0000","#FF6347","#FF7F50","#FF8C00","#FFA07A","#FFA500","#FFD700","#FFDEAD","#FFE4B5","#FFE4C4"]

Prompt: ${prompt}
JSON colors:`,
    {
      model: AI.Model.OpenAI_GPT4o,
      stream: false,
    },
  );

  let colors: string[] = [];
  try {
    colors = data ? (JSON.parse(data) as string[]) : [];
  } catch (error) {
    showFailureToast(error, { title: "Could not generate colors, please try again." });
  }

  // Memoize ColorItems creation to avoid recreation on every render
  const colorItems: ColorItem[] = useMemo(() => {
    return colors.map((color, index) => ({
      id: index.toString(),
      color: getFormattedColor(color),
    }));
  }, [colors]);

  const { selection } = useColorsSelection(colorItems);

  return (
    <Grid columns={5} isLoading={isLoading}>
      {colorItems.map((colorItem) => {
        const formattedColor = colorItem.color;
        const previewColor = getPreviewColor(formattedColor);
        const isSelected = selection.helpers.getIsItemSelected(colorItem);
        const content = isSelected
          ? { source: Icon.CircleFilled, tintColor: { light: previewColor, dark: previewColor, adjustContrast: true } }
          : { color: { light: previewColor, dark: previewColor, adjustContrast: false } };

        return (
          <Grid.Item
            key={colorItem.id}
            content={content}
            title={`${isSelected ? "✓ " : ""}${formattedColor}`}
            actions={<Actions colorItem={colorItem} selection={selection} prompt={prompt} />}
          />
        );
      })}
    </Grid>
  );
}

function Actions({ colorItem, selection, prompt }: GenerateColorsActionsProps) {
  const { toggleSelection, selectAll, clearSelection } = selection.actions;
  const { anySelected, allSelected, countSelected } = selection.selected;
  const { getIsItemSelected } = selection.helpers;
  const isSelected = getIsItemSelected(colorItem);
  const formattedColor = colorItem.color;

  return (
    <ActionPanel>
      <ActionPanel.Section title={`Color ${formattedColor}`}>
        <Action.CopyToClipboard content={formattedColor} onCopy={() => addToHistory(formattedColor)} />
        <Action.Paste content={formattedColor} onPaste={() => addToHistory(formattedColor)} />
        <CopyAsSubmenu color={formattedColor} onCopy={() => addToHistory(formattedColor)} />
      </ActionPanel.Section>

      <ActionPanel.Section title="Save Color Palette">
        {countSelected > 0 && (
          <Action
            icon={Icon.AppWindowGrid3x3}
            title={`Save ${countSelected} Color${countSelected > 1 ? "s" : ""} as Palette`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={async () => {
              const selectedColorsArray = Array.from(selection.selected.selectedItems);
              try {
                await launchCommand({
                  name: "save-color-palette",
                  type: LaunchType.UserInitiated,
                  context: { selectedColors: selectedColorsArray, text: prompt },
                });
              } catch (e) {
                await showFailureToast(e);
              }
            }}
          />
        )}
        <Action
          icon={isSelected ? Icon.Checkmark : Icon.Circle}
          title={isSelected ? `Deselect Color ${formattedColor}` : `Select Color ${formattedColor}`}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => toggleSelection(colorItem)}
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
    </ActionPanel>
  );
}
