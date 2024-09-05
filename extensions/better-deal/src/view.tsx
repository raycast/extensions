import { Cache, List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Item } from "./index";

const cache = new Cache();

export default function View() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const cached = cache.get("items");
    const parsedItems: Item[] = cached ? JSON.parse(cached) : [];
    setItems(parsedItems);
  }, []);

  const deleteItem = (index: number) => {
    setItems((prevItems) => {
      const updatedItems = prevItems.filter((_, i) => i !== index);
      cache.set("items", JSON.stringify(updatedItems));
      return updatedItems;
    });
    showToast({
      style: Toast.Style.Success,
      title: "Record Deleted",
      message: "The selected record has been removed.",
    });
  };

  return (
    <List navigationTitle="View Records" searchBarPlaceholder="Search Information...">
      <List.Section title="Previous Records">
        {items.map((item, index) => (
          <List.Item
            key={index}
            title={`Record ${index + 1}`}
            subtitle={`$${item.price.toFixed(2)} x ${item.quantity}`}
            accessories={[
              { text: `${item.unitCost.toFixed(2)}/item` },
              ...(item.unitSize !== undefined ? [{ text: `${item.perUnitSize?.toFixed(2)}/unit size` }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action title="Delete This Record" icon={Icon.Trash} onAction={() => deleteItem(index)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
