import { memo } from "react";

import { List } from "@raycast/api";

import { CharacterActionPanel } from "@/components/CharacterActionPanel";
import DataSetSelector from "@/components/DataSetSelector";
import { useListContext } from "@/context/ListContext";
import { getFilteredSubtitle, getFilteredValue } from "@/utils/string";

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
                actions={<CharacterActionPanel item={item} />}
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
});
