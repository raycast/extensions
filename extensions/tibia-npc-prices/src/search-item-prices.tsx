import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useState } from "react";
import {
  tibiaItems,
  getHighestPrice,
  getAllBuyersSorted,
  TibiaItem,
} from "./data";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const filteredItems = tibiaItems.filter((item) =>
    item.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      searchBarPlaceholder="Search Tibia items..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {filteredItems.map((item) => (
        <ItemListItem key={item.name} item={item} />
      ))}
    </List>
  );
}

function ItemListItem({ item }: { item: TibiaItem }) {
  const highestBuyer = getHighestPrice(item);

  if (!highestBuyer) return null;

  return (
    <List.Item
      title={item.name}
      subtitle={`${highestBuyer.price} gp`}
      accessories={[
        {
          text: highestBuyer.name,
          icon: Icon.Person,
        },
        {
          tag: {
            value: highestBuyer.location,
            color: Color.Blue,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View All Buyers"
            icon={Icon.List}
            target={<ItemDetail item={item} />}
          />
          <Action.CopyToClipboard
            title="Copy Highest Price"
            content={`${item.name}: ${highestBuyer.price} gp at ${highestBuyer.name}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function ItemDetail({ item }: { item: TibiaItem }) {
  const allBuyers = getAllBuyersSorted(item);
  const highestBuyer = allBuyers[0];

  return (
    <List navigationTitle={item.name} searchBarPlaceholder="Search buyers...">
      <List.Section title="All Buyers (Sorted by Price)">
        {allBuyers.map((buyer, index) => (
          <List.Item
            key={`${buyer.name}-${index}`}
            title={buyer.name}
            subtitle={buyer.location}
            accessories={[
              {
                text: `${buyer.price} gp`,
                icon: {
                  source: Icon.Coins,
                  tintColor:
                    buyer.price === highestBuyer.price
                      ? Color.Green
                      : Color.Yellow,
                },
              },
              ...(buyer.price === highestBuyer.price
                ? [{ tag: { value: "Highest", color: Color.Green } }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Price Info"
                  content={`${item.name}: ${buyer.price} gp at ${buyer.name} (${buyer.location})`}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {item.stackable && (
        <List.Section title="Note">
          <List.Item
            title="This item is stackable"
            icon={{ source: Icon.Layers, tintColor: Color.Blue }}
          />
        </List.Section>
      )}
    </List>
  );
}
