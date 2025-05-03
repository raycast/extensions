import { useMemo } from "react";
import { showHUD, Clipboard, Action, ActionPanel, Icon, List } from "@raycast/api";
import { Color, ListItemProps, ColorGroups } from "./types";

export function findColor(colors: ColorGroups, text: string): Color[] {
  let foundColors: Color[] = [];

  Object.keys(colors).forEach((baseName) => {
    const matchedColors = colors[baseName].filter((color: Color) => {
      return color.color.replace("#", "").toLowerCase() === text.replace("#", "").toLowerCase();
    });

    if (matchedColors.length > 0) {
      foundColors = foundColors.concat(matchedColors);
    }
  });

  return foundColors;
}

export function useColorSections(colors: ColorGroups, searchText: string, selectedSection: string) {
  const allSections = useMemo(() => {
    return Object.entries(colors).map(([baseName, colorDefs]) => {
      const items = colorDefs.map((color) => createListItem({ title: color.title, color: color.color }));
      return { title: baseName, items };
    });
  }, [colors]);

  const filteredSections = useMemo(() => {
    let result = allSections;

    if (selectedSection) {
      result = result.filter((section) => section.title === selectedSection);
    }

    if (searchText) {
      const searchTextLower = searchText.toLowerCase();
      result = result
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              item.props.title.toLowerCase().includes(searchTextLower) ||
              item.props.subtitle.toLowerCase().includes(searchTextLower),
          ),
        }))
        .filter((section) => section.items.length > 0);
    }

    return result;
  }, [searchText, selectedSection, allSections]);

  const categories = useMemo(() => allSections.map((section) => section.title), [allSections]);

  return { filteredSections, categories };
}

function createListItem({ title, color }: ListItemProps) {
  return (
    <List.Item
      title={title}
      subtitle={color.toUpperCase()}
      key={title}
      icon={{ source: Icon.CircleFilled, tintColor: { light: color, dark: color } }}
      actions={
        <ActionPanel>
          <Action
            title="Copy Color"
            onAction={async () => {
              await Clipboard.copy(color);
              await showHUD(`${color.toUpperCase()} (${title}) was copied to your clipboard`);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
