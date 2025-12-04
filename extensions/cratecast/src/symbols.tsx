import { Action, ActionPanel, Color, List } from "@raycast/api";
import { Crate, useCrateSymbols, SymbolItem } from "./api";
import { useState } from "react";

export default function Symbols({ crate }: { crate: Crate }) {
  const [symbols, loading] = useCrateSymbols(crate);
  const [filter, setFilter] = useState<string>("All Symbols");

  const symbolsGroupedByCategory = symbols?.reduce<{ [category: string]: SymbolItem[] }>((acc, symbol) => {
    if (!acc[symbol.category]) {
      acc[symbol.category] = [];
    }
    acc[symbol.category].push(symbol);
    return acc;
  }, {});

  const categories = symbolsGroupedByCategory ? Object.keys(symbolsGroupedByCategory) : [];

  return (
    <List
      isLoading={loading}
      navigationTitle={`${crate.name}`}
      searchBarPlaceholder="Filter symbols by name"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter By Category" storeValue={false} onChange={(value) => setFilter(value)}>
          <List.Dropdown.Section title="Categories">
            <List.Dropdown.Item key="All" title="All" value="All Symbols" />
            {categories.map((category) => (
              <List.Dropdown.Item key={category} title={category} value={category} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {symbolsGroupedByCategory &&
        filteredCategories(symbolsGroupedByCategory, filter).map(([category, symbolsForCategory]) => (
          <List.Section title={category} key={category}>
            {symbolsForCategory.map((symbol) => (
              <SymbolItemComponent key={symbol.full_name} symbol={symbol} />
            ))}
          </List.Section>
        ))}
    </List>
  );
}

function SymbolItemComponent({ symbol }: { symbol: SymbolItem }): JSX.Element {
  return (
    <List.Item
      key={symbol.full_name}
      icon={{ source: "rust-icon.png" }}
      title={symbol.name}
      accessories={[
        { tag: { value: symbol.category.slice(0, -1), color: Color.Green } },
        {
          tag: { value: symbol.full_name, color: Color.Blue },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in docs.rs" url={symbol.docsrs_url} />
          <Action.CopyToClipboard title="Copy symbol name" content={symbol.name} />
        </ActionPanel>
      }
    />
  );
}

function filteredCategories(symbolsGroupedByCategory: { [category: string]: SymbolItem[] }, filter: string) {
  return Object.entries(symbolsGroupedByCategory).filter(
    ([category]) => filter === "All Symbols" || category === filter,
  );
}
