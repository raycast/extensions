import { ActionPanel, Action, List, Icon, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { API, ITEM_TYPES, Item, MetaForgeUrl, PaginatedResponse, RARITIES, apiUrl } from "./api";
import { formatNumber } from "./format";
import { ItemDetail } from "./item-detail";
import { useBlueprintStore } from "./storage";
import { GuideActions, itemIcon, loadFailure, rarityAccessory } from "./ui";

// Dropdown values are prefixed so a single dropdown can filter by either type or rarity.
type Filter = "all" | `type:${string}` | `rarity:${string}`;

function filterParams(filter: Filter): Record<string, string> {
  if (filter.startsWith("type:")) return { item_type: filter.slice("type:".length) };
  if (filter.startsWith("rarity:")) return { rarity: filter.slice("rarity:".length) };
  return {};
}

export default function SearchItems() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const blueprints = useBlueprintStore();

  const { isLoading, data, pagination } = useFetch(
    (options) => apiUrl(API.items, { page: options.page + 1, search: searchText, ...filterParams(filter) }),
    {
      mapResult(result: PaginatedResponse<Item>) {
        return { data: result.data, hasMore: result.pagination?.hasNextPage ?? false };
      },
      keepPreviousData: true,
      initialData: [],
      failureToastOptions: loadFailure("items"),
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search items..."
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Items" value={filter} onChange={(value) => setFilter(value as Filter)}>
          <List.Dropdown.Item title="All Items" value="all" />
          <List.Dropdown.Section title="Item Types">
            {ITEM_TYPES.map((type) => (
              <List.Dropdown.Item key={type} title={type} value={`type:${type}`} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Rarity">
            {RARITIES.map((rarity) => (
              <List.Dropdown.Item key={rarity} title={rarity} value={`rarity:${rarity}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {data.map((item) => {
        const isBlueprint = item.item_type === "Blueprint";
        const isObtained = isBlueprint && blueprints.isObtained(item.id);

        return (
          <List.Item
            key={item.id}
            icon={itemIcon(item.icon)}
            title={item.name}
            subtitle={item.item_type}
            accessories={[
              ...(isBlueprint
                ? [{ icon: isObtained ? Icon.CheckCircle : Icon.Circle, tooltip: isObtained ? "Obtained" : "Needed" }]
                : []),
              ...rarityAccessory(item.rarity),
              ...(typeof item.value === "number" ? [{ icon: Icon.Coins, text: formatNumber(item.value) }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="View Details" icon={Icon.Eye} target={<ItemDetail id={item.id} preview={item} />} />
                {isBlueprint && (
                  <Action
                    title={isObtained ? "Mark as Needed" : "Mark as Obtained"}
                    icon={isObtained ? Icon.Circle : Icon.CheckCircle}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    onAction={() => blueprints.toggleObtained(item.id, item.name)}
                  />
                )}
                <Action.OpenInBrowser url={MetaForgeUrl.item(item.id)} />
                <GuideActions links={item.guide_links} url={item.guide_url} />
                <Action.CopyToClipboard title="Copy Item Name" content={item.name} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
