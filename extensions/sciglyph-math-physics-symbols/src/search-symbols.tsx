import { Action, ActionPanel, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { categories, type SymbolEntry, symbols } from "./data/symbols";

const ALL_CATEGORIES = "All";

function getAliasPreview(symbol: SymbolEntry): string {
  return symbol.aliases.slice(0, 5).join(", ");
}

function getUnicodeCodePoints(value: string): string {
  return Array.from(value)
    .map((char) => {
      const codePoint = char.codePointAt(0);

      if (codePoint === undefined) return "";

      return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
    })
    .filter(Boolean)
    .join(" ");
}

function getSymbolTitle(symbol: SymbolEntry): string {
  return `${symbol.value}    ${symbol.name}`;
}

function getAccessories(symbol: SymbolEntry) {
  return [{ text: symbol.category }, ...(symbol.latex ? [{ text: symbol.latex }] : [])];
}

export default function Command() {
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  const filteredSymbols = useMemo(() => {
    if (category === ALL_CATEGORIES) return symbols;
    return symbols.filter((symbol) => symbol.category === category);
  }, [category]);

  return (
    <List
      navigationTitle="SciGlyph"
      searchBarPlaceholder="Search delta, omega, xbar, hbar, tensor, pKa..."
      searchBarAccessory={
        <List.Dropdown tooltip="Category" value={category} onChange={setCategory} storeValue>
          {categories.map((item) => (
            <List.Dropdown.Item key={item} title={item} value={item} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section
        title={category === ALL_CATEGORIES ? "All Symbols" : category}
        subtitle={`${filteredSymbols.length}`}
      >
        {filteredSymbols.map((symbol) => (
          <SymbolListItem key={symbol.id} symbol={symbol} />
        ))}
      </List.Section>
    </List>
  );
}

function SymbolListItem({ symbol }: { symbol: SymbolEntry }) {
  const keywords = [symbol.value, symbol.name, symbol.category, symbol.latex ?? "", ...symbol.aliases];
  const unicodeCodePoints = getUnicodeCodePoints(symbol.value);

  return (
    <List.Item
      id={symbol.id}
      title={getSymbolTitle(symbol)}
      subtitle={getAliasPreview(symbol)}
      keywords={keywords}
      accessories={getAccessories(symbol)}
      actions={
        <ActionPanel>
          <Action.Paste title="Paste Symbol" content={symbol.value} />

          <Action.CopyToClipboard title="Copy Symbol" content={symbol.value} />

          {symbol.latex ? (
            <Action.CopyToClipboard
              title="Copy LaTeX"
              content={symbol.latex}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          ) : null}

          <Action.CopyToClipboard
            title="Copy Unicode"
            content={unicodeCodePoints}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />

          <Action.CopyToClipboard
            title="Copy Name"
            content={symbol.name}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
