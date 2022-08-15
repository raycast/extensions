import { ActionPanel, Action, Color, Grid, environment, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import fs from "node:fs";

export interface Preferences {
  primaryAction: string;
  gridItemSize: Grid.ItemSize;
  showName: boolean;
}

export interface Symbol {
  name: string;
  symbol: string;
  categories: string[];
  searchTerms: string[];
}

export interface Category {
  name: string;
  title: string;
  symbol: string;
}

const { primaryAction, gridItemSize, showName }: Preferences = getPreferenceValues();

export default function Command() {
  const data: {
    symbols: Symbol[];
    categories: Category[];
  } = JSON.parse(fs.readFileSync(`${environment.assetsPath}/symbols/data.json`, { encoding: "utf8" }));

  const [category, setCategory] = useState<string | undefined>();

  return (
    <Grid
      isLoading={category === undefined}
      searchBarPlaceholder="Search SF Symbols..."
      inset={Grid.Inset.Large}
      itemSize={gridItemSize}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select SF Symbol Category"
          storeValue={true}
          onChange={(newValue) => setCategory(newValue)}
        >
          <Grid.Dropdown.Item
            value={data.categories[0].name}
            title={data.categories[0].title}
            icon={{ source: `symbols/images/${data.categories[0].symbol}.png`, tintColor: Color.PrimaryText }}
          />
          <Grid.Dropdown.Section>
            {data.categories.slice(1).map((category, index) => (
              <Grid.Dropdown.Item
                key={index}
                value={category.name}
                title={category.title}
                icon={{ source: `symbols/images/${category.symbol}.png`, tintColor: Color.PrimaryText }}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {category &&
        data.symbols
          .filter((s) => category === "all" || s.categories.includes(category))
          .map((symbol: Symbol, index: number) => (
            <Grid.Item
              key={index}
              title={showName ? symbol.name : undefined}
              content={{ source: `symbols/images/${symbol.name}.png`, tintColor: Color.PrimaryText }}
              keywords={symbol.searchTerms.concat([symbol.name])}
              actions={<SymbolActions name={symbol.name} symbol={symbol.symbol} />}
            />
          ))}
    </Grid>
  );
}

const SymbolActions = (props: { name: string; symbol: string }): JSX.Element => {
  const { name, symbol } = props;

  const actions: { [key: string]: JSX.Element } = {
    paste: (
      <Action.Paste
        key="paste"
        title="Paste Symbol"
        content={symbol}
        shortcut={{ modifiers: ["shift", "cmd"], key: "v" }}
      />
    ),
    copy: (
      <Action.CopyToClipboard
        key="copy"
        title="Copy Symbol"
        content={symbol}
        shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
      />
    ),
    pasteName: (
      <Action.Paste
        key="pasteName"
        title="Paste Name"
        content={name}
        shortcut={{ modifiers: ["shift"], key: "n" }}
      />
    ),
    copyName: (
      <Action.CopyToClipboard
        key="copyName"
        title="Copy Name"
        content={name}
        shortcut={{ modifiers: ["shift", "cmd"], key: "n" }}
      />
    ),
    pasteImage: (
      <Action.Paste
        key="pasteImage"
        title="Paste Swift UI Image"
        content={`Image(systemName: "${name}")`}
        icon={"../assets/swift.svg"}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
      />
    ),
    copyImage: (
      <Action.CopyToClipboard
        key="copyImage"
        title="Copy Swift UI Image"
        content={`Image(systemName: "${name}")`}
        icon={"../assets/swift.svg"}
        shortcut={{ modifiers: ["shift", "cmd"], key: "i" }}
      />
    ),
  };

  let order: JSX.Element[] = [];

  if (primaryAction == "copySymbol") {
    order = [
      actions["copy"],
      actions["paste"],
      actions["copyName"],
      actions["pasteName"],
      actions["copyImage"],
      actions["pasteImage"],
    ];
  } else if (primaryAction == "pasteSymbol") {
    order = [
      actions["paste"],
      actions["copy"],
      actions["pasteName"],
      actions["copyName"],
      actions["pasteImage"],
      actions["copyImage"],
    ];
  } else if (primaryAction == "copyName") {
    order = [
      actions["copyName"],
      actions["pasteName"],
      actions["copy"],
      actions["paste"],
      actions["copyImage"],
      actions["pasteImage"],
    ];
  } else if (primaryAction == "pasteName") {
    order = [
      actions["pasteName"],
      actions["copyName"],
      actions["paste"],
      actions["copy"],
      actions["copyImage"],
      actions["pasteImage"],
    ];
  } else if (primaryAction == "copyImage") {
    order = [
      actions["copyImage"],
      actions["pasteImage"],
      actions["copyName"],
      actions["pasteName"],
      actions["copy"],
      actions["paste"],
    ];
  } else if (primaryAction == "pasteImage") {
    order = [
      actions["pasteImage"],
      actions["copyImage"],
      actions["pasteName"],
      actions["copyName"],
      actions["paste"],
      actions["copy"],
    ];
  }

  return (
    <ActionPanel title={name}>
      {...order.slice(0, 2)}
      <ActionPanel.Section>{...order.slice(2)}</ActionPanel.Section>
    </ActionPanel>
  );
};
