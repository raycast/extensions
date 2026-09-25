import { AI, Action, ActionPanel, Grid, LaunchProps, List } from "@raycast/api";
import { showFailureToast, useAI } from "@raycast/utils";
import { useState } from "react";
import CopyAsSubmenu from "./components/CopyAsSubmenu";
import MultipleColorActions from "./components/MultipleColorActions";
import { useColorsSelection } from "./hooks/useColorsSelection";
import { addToHistory } from "./lib/history";
import { SelectMode, UseColorsSelectionObject } from "./lib/types";
import { getFormattedColor, getIcon, getPreviewColor } from "./lib/utils";

export default function GenerateColors(props: LaunchProps<{ arguments: Arguments.GenerateColors }>) {
  const { data, isLoading } = useAI(
    `Generate colors based on a prompt.

Please follow these rules:
- You MUST return an JSON array of HEX colors without any other characters. It should be PARSABLE and MINIFIED.
- Return an empty JSON array if it's not possible to generate colors.

Examples:
- ["#66D3BB","#7EDDC6","#96E7D1","#AEEFDB","#C6F9E6"]
- ["#0000CD","#0000FF","#1E90FF"]
- ["#FF0000","#FF6347","#FF7F50","#FF8C00","#FFA07A","#FFA500","#FFD700","#FFDEAD","#FFE4B5","#FFE4C4"]

Prompt: ${props.arguments.prompt}
JSON colors:`,
    {
      model: AI.Model["OpenAI_GPT-5_mini"],
      stream: false,
    },
  );

  const [selectMode, setSelectMode] = useState<SelectMode>("single");

  let colors: string[] = [];
  try {
    colors = data ? (JSON.parse(data) as string[]) : [];
  } catch (error) {
    showFailureToast(error, { title: "Could not generate colors, please try again." });
  }

  const { selection } = useColorsSelection<string>(colors);

  if (selectMode === "multi") {
    return (
      <List
        isLoading={isLoading}
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
        {colors.map((c, index) => {
          const formattedColor = getFormattedColor(c);
          const previewColor = getPreviewColor(c);
          const isSelected = selection.helpers.getIsItemSelected(c);

          return (
            <List.Item
              key={index}
              icon={getIcon(previewColor)}
              title={`${isSelected ? "✓ " : ""}${formattedColor}`}
              actions={<MultiActions color={c} formattedColor={formattedColor} selection={selection} />}
            />
          );
        })}
      </List>
    );
  }

  return (
    <Grid
      columns={5}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Switch Select Mode" value={selectMode} onChange={(v) => setSelectMode(v as SelectMode)}>
          <Grid.Dropdown.Item title="Single-Select Mode" value="single" />
          <Grid.Dropdown.Item title="Multi-Select Mode" value="multi" />
        </Grid.Dropdown>
      }
    >
      {colors.map((c, index) => {
        const formattedColor = getFormattedColor(c);
        const previewColor = getPreviewColor(c);
        const color = { light: previewColor, dark: previewColor, adjustContrast: false };

        return (
          <Grid.Item
            key={index}
            content={{ color }}
            title={formattedColor}
            actions={
              <ActionPanel>
                <GeneratedColorActions formattedColor={formattedColor} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}

type MultiActionsProps = {
  color: string;
  formattedColor: string;
  selection: UseColorsSelectionObject<string>;
};

function MultiActions({ color, formattedColor, selection }: MultiActionsProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <GeneratedColorActions formattedColor={formattedColor} />
      </ActionPanel.Section>
      <MultipleColorActions
        item={color}
        selection={selection}
        onCopySelected={() => selection.selected.selectedItems.forEach((item) => addToHistory(item))}
      />
    </ActionPanel>
  );
}

function GeneratedColorActions({ formattedColor }: { formattedColor: string }) {
  const saveColor = () => addToHistory(formattedColor);
  return (
    <>
      <Action.CopyToClipboard content={formattedColor} onCopy={saveColor} />
      <Action.Paste content={formattedColor} onPaste={saveColor} />
      <CopyAsSubmenu color={formattedColor} onCopy={saveColor} />
    </>
  );
}
