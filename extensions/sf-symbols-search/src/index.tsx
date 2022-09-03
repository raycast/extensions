import { ActionPanel, Action, Color, Grid, environment, getPreferenceValues } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { readFileSync } from "node:fs";
import { execSync } from "child_process";
import { SaveActions, getPinnedSymbols, getRecentSymbols, addRecentSymbol } from "./storage";

export interface Preferences {
  primaryAction: "copySymbol" | "pasteSymbol" | "copyName" | "pasteName";
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

export interface SymbolProps {
  symbol: Symbol;
  refresh: () => void;
  pinned?: boolean;
  recent?: boolean;
}

const { primaryAction, gridItemSize, showName }: Preferences = getPreferenceValues();

try {
  execSync("ls /Applications | grep 'SF Symbols beta.app'");
} catch (err) {
  console.log(err);
}

function getDataPath() {
  var fileName = "data";

  try {
    if (execSync("ls /Applications | grep 'SF Symbols beta.app'").length > 0) {
      fileName += "_beta";
    }
  } catch {}

  return `${environment.assetsPath}/symbols/${fileName}.json`;
}

export default function Command() {
  const data: {
    symbols: Symbol[];
    categories: Category[];
  } = JSON.parse(readFileSync(getDataPath(), { encoding: "utf8" }));

  const [pinned, setPinned] = useState(getPinnedSymbols());
  const [recent, setRecent] = useState(getRecentSymbols());

  const [category, setCategory] = useState<string | undefined>();

  const [refreshState, setRefreshState] = useState(false);
  const refresh = () => setRefreshState(!refreshState);

  useEffect(() => {
    setPinned(getPinnedSymbols());
    setRecent(getRecentSymbols());
  }, [refreshState]);

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
            title="All Categories"
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
      {category && (
        <React.Fragment>
          <Grid.Section title="Pinned Symbols">
            {pinned
              .filter((s) => category === "all" || s.categories.includes(category))
              .map((symbol: Symbol, index: number) => (
                <Symbol key={index} symbol={symbol} refresh={refresh} pinned />
              ))}
          </Grid.Section>
          <Grid.Section title="Recent Symbols">
            {recent
              .filter((s) => category === "all" || s.categories.includes(category))
              .map((symbol: Symbol, index: number) => (
                <Symbol key={index} symbol={symbol} refresh={refresh} recent />
              ))}
          </Grid.Section>
          <Grid.Section title={recent.length + pinned.length > 0 ? "All Symbols" : undefined}>
            {data.symbols
              .filter((s) => category === "all" || s.categories.includes(category))
              .map((symbol: Symbol, index: number) => (
                <Symbol key={index} symbol={symbol} refresh={refresh} />
              ))}
          </Grid.Section>
        </React.Fragment>
      )}
    </Grid>
  );
}

const Symbol = (props: SymbolProps) => {
  const { symbol } = props;
  return (
    <Grid.Item
      title={showName ? symbol.name : undefined}
      content={{ source: `symbols/images/${symbol.name}.png`, tintColor: Color.PrimaryText }}
      keywords={symbol.searchTerms.concat([symbol.name])}
      actions={<SymbolActions {...props} />}
    />
  );
};

const SymbolActions = (props: SymbolProps): JSX.Element => {
  const { name, symbol } = props.symbol;

  const actions: { [key: string]: JSX.Element } = {
    paste: (
      <Action.Paste
        key="paste"
        title="Paste Symbol"
        content={symbol}
        shortcut={{ modifiers: ["shift", "cmd"], key: "v" }}
        onPaste={() => {
          addRecentSymbol(props.symbol);
          props.refresh();
        }}
      />
    ),
    copy: (
      <Action.CopyToClipboard
        key="copy"
        title="Copy Symbol"
        content={symbol}
        shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
        onCopy={() => {
          addRecentSymbol(props.symbol);
          props.refresh();
        }}
      />
    ),
    pasteName: (
      <Action.Paste
        key="pasteName"
        title="Paste Name"
        content={name}
        shortcut={{ modifiers: ["shift", "cmd"], key: "v" }}
        onPaste={() => {
          addRecentSymbol(props.symbol);
          props.refresh();
        }}
      />
    ),
    copyName: (
      <Action.CopyToClipboard
        key="copyName"
        title="Copy Name"
        content={name}
        shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
        onCopy={() => {
          addRecentSymbol(props.symbol);
          props.refresh();
        }}
      />
    ),
  };

  let order: JSX.Element[] = [];

  if (primaryAction == "pasteSymbol") {
    order = [actions["paste"], actions["copy"], actions["copyName"], actions["pasteName"]];
  } else if (primaryAction == "copySymbol") {
    order = [actions["copy"], actions["paste"], actions["copyName"], actions["pasteName"]];
  } else if (primaryAction == "pasteName") {
    order = [actions["pasteName"], actions["copyName"], actions["paste"], actions["copy"]];
  } else if (primaryAction == "copyName") {
    order = [actions["copyName"], actions["pasteName"], actions["copy"], actions["paste"]];
  }

  return (
    <ActionPanel title={name}>
      {...order}
      <SaveActions {...props} />
    </ActionPanel>
  );
};
