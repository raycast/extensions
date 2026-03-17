import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import debounce from "lodash.debounce";
import { useCallback, useMemo, useState } from "react";
import { fetchItems, fetchItem } from "./api";
import Descriptions from "./components/description";
import { fixItemEffectText } from "./utils";

export default function PokeItems(props: { arguments: { search?: string } }) {
  const { search } = props.arguments;
  const [pocket, setPocket] = useState<string>("all");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const { data: items, isLoading } = usePromise(fetchItems);

  const { data: item } = usePromise(fetchItem, [selectedItemId || 0], {
    execute: selectedItemId !== null,
  });

  const debouncedSelectionChange = useCallback(
    debounce((itemId: number | null) => {
      setSelectedItemId(itemId);
    }, 300),
    [],
  );

  const onSelectionChange = (itemId: string | null) => {
    if (itemId) {
      debouncedSelectionChange(parseInt(itemId));
    } else {
      debouncedSelectionChange(null);
    }
  };

  const pockets = useMemo(() => {
    return groupBy(
      items,
      (i) =>
        i.itemcategory?.itempocket?.itempocketnames[0]?.name ||
        i.itemcategory?.itempocket?.name ||
        "Unknown Pocket",
    );
  }, [items]);

  const uniquePockets = useMemo(() => {
    return Object.keys(pockets || {}).sort();
  }, [pockets]);

  const filteredPockets = useMemo(() => {
    let filtered = pockets;

    if (pocket !== "all") {
      filtered = { [pocket]: pockets[pocket] };
    }

    if (!search) return filtered;

    const searchFiltered: Record<string, typeof items> = {};
    Object.entries(filtered || {}).forEach(([pocketName, list]) => {
      const filteredList = list.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()),
      );
      if (filteredList.length > 0) {
        searchFiltered[pocketName] = filteredList;
      }
    });
    return searchFiltered;
  }, [items, pockets, pocket, search]);

  return (
    <List
      throttle
      isShowingDetail={true}
      isLoading={isLoading}
      searchBarPlaceholder="Search Items..."
      selectedItemId={selectedItemId ? String(selectedItemId) : undefined}
      onSelectionChange={onSelectionChange}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Pocket"
          value={pocket}
          onChange={setPocket}
        >
          <List.Dropdown.Item title="All Pockets" value="all" />
          {uniquePockets.map((pocketName) => (
            <List.Dropdown.Item
              key={pocketName}
              title={pocketName}
              value={pocketName}
            />
          ))}
        </List.Dropdown>
      }
    >
      {Object.entries(filteredPockets).map(([pocketName, itemList]) => {
        return (
          <List.Section key={pocketName} title={pocketName}>
            {itemList?.map((itemData) => {
              const itemName = itemData.itemnames[0]?.name || itemData.name;
              const itemIcon = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemData.name}.png`;
              const categoryName =
                itemData.itemcategory?.itemcategorynames[0]?.name ||
                itemData.itemcategory?.name ||
                "Unknown Category";

              return (
                <List.Item
                  key={itemData.name}
                  id={String(itemData.id)}
                  title={itemName}
                  icon={itemIcon}
                  keywords={[itemData.name, itemName]}
                  detail={
                    <List.Item.Detail
                      markdown={json2md([
                        {
                          h1: itemName,
                        },
                        {
                          p: fixItemEffectText(
                            itemData.itemeffecttexts[0]?.effect ||
                              "No effect description available.",
                          ),
                        },
                      ])}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Category"
                            text={categoryName}
                          />
                          {itemData.cost ? (
                            <List.Item.Detail.Metadata.Label
                              title="Price"
                              text={`${itemData.cost} Poké Dollars`}
                            />
                          ) : null}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    item &&
                    item.itemflavortexts &&
                    item.itemflavortexts.length > 0 && (
                      <ActionPanel>
                        <ActionPanel.Section title="Information">
                          <Action.Push
                            title="Descriptions"
                            icon={Icon.List}
                            target={
                              <Descriptions
                                name={itemName}
                                entries={item.itemflavortexts}
                              />
                            }
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    )
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
