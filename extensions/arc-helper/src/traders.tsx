import { ActionPanel, Action, List, Detail, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { API, TradersResponse, TraderItem, getRarityColor } from "./api";

function TraderItemDetail({ item, trader }: { item: TraderItem; trader: string }) {
  const markdown = `
# ${item.name}

![Icon](${item.icon})

${item.description || "No description available."}

---

## Details

| Property | Value |
|----------|-------|
| **Type** | ${item.item_type} |
| **Rarity** | ${item.rarity} |
| **Base Value** | ${item.value} |
| **Trader Price** | ${item.trader_price} |
| **Sold By** | ${trader} |
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Trader" text={trader} />
          <Detail.Metadata.Label title="Type" text={item.item_type} />
          <Detail.Metadata.TagList title="Rarity">
            <Detail.Metadata.TagList.Item text={item.rarity} color={getRarityColor(item.rarity)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Base Value" text={String(item.value)} />
          <Detail.Metadata.Label title="Trader Price" text={String(item.trader_price)} icon={Icon.Coins} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="MetaForge"
            target={`https://metaforge.app/arc-raiders/items/${item.id}`}
            text="View on MetaForge"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://metaforge.app/arc-raiders/items/${item.id}`} />
          <Action.CopyToClipboard title="Copy Item Name" content={item.name} />
        </ActionPanel>
      }
    />
  );
}

export default function Traders() {
  const [searchText, setSearchText] = useState("");
  const [traderFilter, setTraderFilter] = useState<string>("all");

  const { isLoading, data } = useFetch<TradersResponse>(API.traders, {
    keepPreviousData: true,
  });

  const tradersData = data?.data || {};
  const traderNames = Object.keys(tradersData).sort();

  const filteredTraders = traderFilter === "all" ? traderNames : traderNames.filter((t) => t === traderFilter);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search trader items..."
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Trader" value={traderFilter} onChange={setTraderFilter}>
          <List.Dropdown.Item title="All Traders" value="all" />
          <List.Dropdown.Section title="Traders">
            {traderNames.map((trader) => (
              <List.Dropdown.Item key={trader} title={trader} value={trader} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredTraders.map((trader) => {
        const items = tradersData[trader] || [];
        const filteredItems = items.filter((item) => {
          if (searchText === "") return true;
          const search = searchText.toLowerCase();
          return (
            item.name.toLowerCase().includes(search) ||
            item.description?.toLowerCase().includes(search) ||
            item.item_type.toLowerCase().includes(search)
          );
        });

        if (filteredItems.length === 0 && searchText !== "") return null;

        return (
          <List.Section key={trader} title={trader} subtitle={`${filteredItems.length} items`}>
            {filteredItems.map((item) => (
              <List.Item
                key={`${trader}-${item.id}`}
                icon={{ source: item.icon, fallback: Icon.Box }}
                title={item.name}
                subtitle={item.item_type}
                accessories={[
                  {
                    tag: {
                      value: item.rarity,
                      color: getRarityColor(item.rarity) as Color,
                    },
                  },
                  { icon: Icon.Coins, text: `${item.trader_price}` },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={<TraderItemDetail item={item} trader={trader} />}
                    />
                    <Action.OpenInBrowser url={`https://metaforge.app/arc-raiders/items/${item.id}`} />
                    <Action.CopyToClipboard title="Copy Item Name" content={item.name} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
