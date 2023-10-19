import { Action, ActionPanel, Color, List } from "@raycast/api";
import { Crate, useCrateSymbols, SymbolItem } from "./api";

export default function Symbols({ crate }: { crate: Crate }) {
  const [symbols, loading] = useCrateSymbols(crate);

  // Group symbols by category using reduce
  const symbolsGroupedByCategory = symbols?.reduce<{ [category: string]: SymbolItem[] }>((acc, symbol) => {
    if (!acc[symbol.category]) {
      acc[symbol.category] = [];
    }
    acc[symbol.category].push(symbol);
    return acc;
  }, {});

  return (
    <List isLoading={loading} navigationTitle={`${crate.name}`}>
      {symbolsGroupedByCategory &&
        Object.entries(symbolsGroupedByCategory).map(([category, symbolsForCategory]) => (
          <List.Section title={category} key={category}>
            {symbolsForCategory.map((symbol) => (
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
            ))}
          </List.Section>
        ))}
    </List>
  );
}
