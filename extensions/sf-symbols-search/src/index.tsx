import { ActionPanel, Action, Grid, getPreferenceValues, Color } from "@raycast/api";
import { Symbol, getSymbols, categories } from "./utils/utils";
import { useState } from "react";
import fs from "fs";

interface Preferences {
  gridSize: "small" | "medium" | "large";
  primaryAction: "paste" | "copy" | "copyName" | "copySVG";
  showName: boolean;
}

export default function Command() {
  const prefs: Preferences = getPreferenceValues();
  const size: Grid.ItemSize =
    prefs.gridSize === "small"
      ? Grid.ItemSize.Small
      : prefs.gridSize === "medium"
      ? Grid.ItemSize.Medium
      : Grid.ItemSize.Large;
  const showName = prefs.showName;

  const symbols: Symbol[] = getSymbols();
  const [category, setCategory] = useState<string | null>(null);

  return (
    <Grid
      isLoading={false}
      itemSize={size}
      inset={Grid.Inset.Small}
      searchBarPlaceholder="Search SF Symbols..."
      searchBarAccessory={
        <Grid.Dropdown
          storeValue={true}
          tooltip="Categories"
          onChange={(value: string) => {
            if (value) setCategory(value);
            else setCategory(null);
          }}
        >
          <Grid.Dropdown.Item value={""} title="All Categories" />
          <Grid.Dropdown.Section>
            {categories.names.map((name: string, index: number) => (
              <Grid.Dropdown.Item key={index} value={categories.values[index]} title={name} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {symbols
        .filter((symbol: Symbol) => category === null || symbol.categories.includes(category))
        .map((symbol: Symbol) => {
          return (
            <Grid.Item
              key={symbol.name}
              title={showName ? symbol.name : undefined}
              content={{ source: `../assets/sf-symbols/${symbol.name}.svg`, tintColor: Color.PrimaryText }}
              keywords={symbol.categories.concat([symbol.name])}
              actions={getActions(prefs, symbol)}
            />
          );
        })}
    </Grid>
  );
}

function getActions(prefs: Preferences, symbol: Symbol) {
  if (prefs.primaryAction === "paste") {
    return (
      <ActionPanel>
        {symbol.symbol && <Action.Paste title="Paste Symbol" content={symbol.symbol} />}
        {symbol.symbol && <Action.CopyToClipboard title="Copy Symbol" content={symbol.symbol} />}
        <Action.CopyToClipboard title="Copy Name" content={symbol.name} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        <Action.CopyToClipboard
          title="Copy SVG Code"
          content={fs.readFileSync(symbol.svg, "utf8")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel>
    );
  } else if (prefs.primaryAction === "copy") {
    return (
      <ActionPanel>
        {symbol.symbol && <Action.CopyToClipboard title="Copy Symbol" content={symbol.symbol} />}
        {symbol.symbol && <Action.Paste title="Paste Symbol" content={symbol.symbol} />}
        <Action.CopyToClipboard title="Copy Name" content={symbol.name} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        <Action.CopyToClipboard
          title="Copy SVG Code"
          content={fs.readFileSync(symbol.svg, "utf8")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel>
    );
  } else if (prefs.primaryAction === "copyName") {
    return (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy Name" content={symbol.name} />
        {symbol.symbol && <Action.CopyToClipboard title="Copy Symbol" content={symbol.symbol} />}
        {symbol.symbol && (
          <Action.Paste title="Paste Symbol" content={symbol.symbol} shortcut={{ modifiers: ["cmd"], key: "v" }} />
        )}
        <Action.CopyToClipboard
          title="Copy SVG Code"
          content={fs.readFileSync(symbol.svg, "utf8")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel>
    );
  } else if (prefs.primaryAction === "copySVG") {
    return (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy SVG Code" content={fs.readFileSync(symbol.svg, "utf8")} />
        {symbol.symbol && <Action.CopyToClipboard title="Copy Symbol" content={symbol.symbol} />}
        <Action.CopyToClipboard title="Copy Name" content={symbol.name} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        {symbol.symbol && (
          <Action.Paste title="Paste Symbol" content={symbol.symbol} shortcut={{ modifiers: ["cmd"], key: "v" }} />
        )}
      </ActionPanel>
    );
  }
}
