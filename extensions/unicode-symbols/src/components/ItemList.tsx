import { memo } from "react";
import { List } from "@raycast/api";
import type { Character, CharacterSection } from "@/types";
import { useListContext } from "@/context/ListContext";
import { CharacterActionPanel } from "@/components/CharacterActionPanel";
import DataSetSelector from "@/components/DataSetSelector";

const upperCaseFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Raycast is breaking on certain character sets in List Mode, so we filter the value and subtitle
 */
const getFilteredValue = (item: Character, section: CharacterSection): string => {
  if (section.sectionTitle === "Ancient Symbols") {
    return "?";
  }
  return item.v;
};

/**
 * Raycast is breaking on certain character sets in List Mode, so we filter the subtitle
 */
const getFilteredSubtitle = (item: Character, section: CharacterSection): string => {
  const subTitle = upperCaseFirst(item.n);
  if (section.sectionTitle === "Ancient Symbols") {
    return `${subTitle} (see in Grid Mode)`;
  }
  return subTitle;
};

export const ItemList = memo(() => {
  const { list, onSearchTextChange, loading } = useListContext();

  return (
    <List
      isLoading={loading}
      onSearchTextChange={onSearchTextChange}
      filtering={false}
      searchBarAccessory={<DataSetSelector />}
    >
      {list.map((section) => (
        <List.Section key={`${section.sectionTitle}-${section.items.length}`} title={section.sectionTitle}>
          {section.items.map((item) => {
            const accessories = [];
            if (item.a?.length) {
              accessories.push({ icon: "⌨️", text: `${item.a.join(", ")}` });
            }

            return (
              <List.Item
                key={`${item.c}-${item.n}`}
                title={getFilteredValue(item, section)}
                subtitle={getFilteredSubtitle(item, section)}
                accessories={accessories}
                actions={<CharacterActionPanel item={item} section={section.sectionTitle} />}
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
});
