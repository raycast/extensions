import { LaunchProps, Cache, showToast, Toast, List, Icon, Action, ActionPanel, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";

const cache = new Cache();

export type Item = {
  price: number;
  quantity: number;
  unitSize?: number;
  unitCost: number;
  perUnitSize?: number;
  updateTime: string;
};

export default function Command(props: LaunchProps) {
  const price = parseFloat(props.arguments.price);
  const quantity = parseFloat(props.arguments.quantity);
  const unitSize = props.arguments.unitSize ? parseFloat(props.arguments.unitSize) : undefined;

  // Input validation
  if (
    isNaN(price) ||
    isNaN(quantity) ||
    price <= 0 ||
    quantity <= 0 ||
    (unitSize !== undefined && (isNaN(unitSize) || unitSize <= 0))
  ) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid Input",
      message: "Please enter valid positive numbers for all fields.",
    });
    return <List />;
  }

  const unitCost = price / quantity;
  const perUnitSize = unitSize ? price / quantity / unitSize : undefined;

  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const cached = cache.get("items");
    const parsedItems: Item[] = cached ? JSON.parse(cached) : [];
    setItems(parsedItems);
  }, []);

  const addNewItem = (newItem: Item) => {
    setItems((prevItems) => {
      const updatedItems = [newItem, ...prevItems].slice(0, 5); // Keep only the 5 most recent items
      cache.set("items", JSON.stringify(updatedItems));
      return updatedItems;
    });
  };

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

  // Add the new item only once when the component mounts
  useEffect(() => {
    const newItem = { price, quantity, unitSize, unitCost, perUnitSize, updateTime: new Date().toISOString() };
    addNewItem(newItem);
  }, []); // Empty dependency array ensures this runs only once

  return (
    <List navigationTitle="Better Deal Calculator" searchBarPlaceholder="Search Information...">
      <List.Section title="Current Input">
        <List.Item
          title="Price"
          icon={Icon.BankNote}
          accessories={[{ text: `$${price.toFixed(2)} x ${quantity}` }]}
          // actions={
          //   <ActionPanel>
          //     <Action.Push title="Add Another Record" icon={Icon.Plus} target={<List />} />
          //   </ActionPanel>
          // }
        />
        <List.Item title="Unit Cost" icon={Icon.Receipt} accessories={[{ text: `${unitCost.toFixed(2)} per item` }]} />
        {unitSize !== undefined && (
          <>
            <List.Item title="Unit Size" icon={Icon.Ruler} accessories={[{ text: `${unitSize}` }]} />
            <List.Item
              title="Cost per Unit Size"
              icon={Icon.Calculator}
              accessories={[{ text: `${perUnitSize?.toFixed(2)} per unit size` }]}
            />
          </>
        )}
      </List.Section>
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
