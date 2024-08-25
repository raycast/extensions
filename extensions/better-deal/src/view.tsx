import { Cache, List } from "@raycast/api";

import { Item } from "./index";

const cache = new Cache();


export default function Command() {

  const cached = cache.get("items");
  const items: Item[] = cached ? JSON.parse(cached) : [];

  return (
    <List navigationTitle="Better Deal Calculator" searchBarPlaceholder="Search Information...">
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
