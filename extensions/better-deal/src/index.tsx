import { LaunchProps, Cache, showToast, Toast, List, Icon, Action, ActionPanel } from "@raycast/api";

const cache = new Cache();

export type Item = { price: number; quantity: number; unitSize?: number; unitCost: number; perUnitSize?: number };

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

  const cached = cache.get("items");
  const items: Item[] = cached ? JSON.parse(cached) : [];

  const newItem = { price, quantity, unitSize, unitCost, perUnitSize };
  const updatedItems = [newItem, ...items.slice(0, 4)]; // Keep only the 5 most recent items

  cache.set("items", JSON.stringify(updatedItems));

  return (
    <List navigationTitle="Better Deal Calculator" searchBarPlaceholder="Search Information...">
      <List.Section title="Current Input">
        <List.Item
          title="Price"
          icon={Icon.BankNote}
          accessories={[{ text: `$${price.toFixed(2)} x ${quantity}` }]}
          actions={
            <ActionPanel>
              <Action.Push title="Add Another Record" icon={Icon.Plus} target={<List />} />
            </ActionPanel>
          }
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
            title={`Record ${index + 1}`}
            subtitle={`$${item.price.toFixed(2)} x ${item.quantity}`}
            accessories={[
              { text: `${item.unitCost.toFixed(2)}/item` },
              ...(item.unitSize !== undefined ? [{ text: `${item.perUnitSize?.toFixed(2)}/unit size` }] : []),
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
