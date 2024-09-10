import { Cache, showToast, Toast, List, Icon, Action, ActionPanel, confirmAlert } from "@raycast/api";
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
            title={`$${item.price.toFixed(2)} for ${item.quantity}`}
            subtitle={`${new Date(item.updateTime).toLocaleString()}`}
            accessories={[
              { text: `$${item.unitCost.toFixed(2)}/item` },
              ...(item.unitSize !== undefined ? [{ text: `${item.perUnitSize?.toFixed(2)}/unit size` }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Delete This Record"
                  icon={Icon.Trash}
                  onAction={() => deleteItem(index)}
                  style={Action.Style.Destructive}
                />
                <Action
                  title="Clear All Records"
                  icon={Icon.Trash}
                  onAction={async () => {
                    if (await confirmAlert({ title: "Are you sure?", rememberUserChoice: true })) {
                      setItems([]); // Clear the items state
                      cache.set("items", JSON.stringify([])); // Clear the cache
                      showToast({
                        style: Toast.Style.Success,
                        title: "All Records Cleared",
                        message: "All records have been removed.",
                      });
                    } else {
                      console.log("canceled"); // Log cancellation
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
