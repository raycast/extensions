import { memo } from "react";

import { List } from "@raycast/api";

import { CharacterActionPanel } from "@/components/CharacterActionPanel";
import DataSetSelector from "@/components/DataSetSelector";
import { useListContext } from "@/context/ListContext";
import { upperCaseFirst } from "@/utils/string";

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
            if (item.aliases?.length) {
              accessories.push({ icon: "⌨️", text: `${item.aliases.join(", ")}` });
            }

            return (
              <List.Item
                key={`${item.code}-${item.name}`}
                title={item.value}
                subtitle={upperCaseFirst(item.name)}
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
