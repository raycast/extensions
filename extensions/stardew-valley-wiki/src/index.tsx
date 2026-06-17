import { ActionPanel, Action, Color, Grid, environment, getPreferenceValues, Icon } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { SaveActions, getPinnedSymbols, getRecentSymbols, addRecentSymbol } from "./storage";
import { readFileSync } from "node:fs";

export interface Preferences {
  version: "beta" | "stable";
  primaryAction: "copySymbol" | "pasteSymbol" | "copyName" | "pasteName";
  gridItemSize: Grid.ItemSize;
  showName: boolean;
}

export type sfsymbol = {
  name: string;
  symbol: string;
  categories: string[];
  searchTerms: string[];
};

export type category = {
  name: string;
  title: string;
  symbol: string;
};

export interface SymbolProps {
  symbol: sfsymbol;
  refresh: () => void;
  pinned?: boolean;
  recent?: boolean;
}

const { version, primaryAction, gridItemSize, showName }: Preferences = getPreferenceValues();

function getDataPath() {
  return `${environment.assetsPath}/symbols/data_beta.json`;
}

function getImageURL(name: string) {
  return `https://raw.githubusercontent.com/Razberrry/svwiki/main/${name}.png`;
}

export default function Command() {
  const data: {
    symbols: sfsymbol[];
    categories: category[];
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
      inset={Grid.Inset.Small}
      itemSize={Grid.ItemSize.Medium}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select SV category" storeValue={true} onChange={(newValue) => setCategory(newValue)}>
          <Grid.Dropdown.Item
            value={data.categories[0].name}
            title="All Categories"
            icon={{
              source: getImageURL(data.categories[0].symbol),
              fallback: Icon.Warning,
            }}
          />
          <Grid.Dropdown.Section>
            {data.categories.slice(1).map((category, index) => (
              <Grid.Dropdown.Item
                key={index}
                value={category.name}
                title={category.title}
                icon={{
                  source: getImageURL(category.symbol),
                }}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {category && (
        <React.Fragment>
          <Grid.Section title="Pinned Characters">
            {pinned
              .filter((s) => category === "all" || s.categories.includes(category))
              .map((symbol: sfsymbol, index: number) => (
                <SFSymbol key={index} symbol={symbol} refresh={refresh} pinned />
              ))}
          </Grid.Section>
          <Grid.Section title="Recent Characters">
            {recent
              .filter((s) => category === "all" || s.categories.includes(category))
              .map((symbol: sfsymbol, index: number) => (
                <SFSymbol key={index} symbol={symbol} refresh={refresh} recent />
              ))}
          </Grid.Section>
          <Grid.Section title={recent.length + pinned.length > 0 ? "All Characters" : undefined}>
            {data.symbols
              .filter((s) => category === "all" || s.categories.includes(category))
              .map((symbol: sfsymbol, index: number) => (
                <SFSymbol key={index} symbol={symbol} refresh={refresh} />
              ))}
          </Grid.Section>
        </React.Fragment>
      )}
    </Grid>
  );
}

const SFSymbol = (props: SymbolProps) => {
  const { symbol } = props;
  return (
    <Grid.Item
      title={showName ? symbol.name : undefined}
      content={{
        source: getImageURL(symbol.name),
        fallback: Icon.Warning,
      }}
      keywords={symbol.searchTerms.concat([symbol.name])}
      actions={<SymbolActions {...props} />}
    />
  );
};

const SymbolActions = (props: SymbolProps): JSX.Element => {
  const { name, symbol } = props.symbol;

  const actions: { [key: string]: JSX.Element } = {
    openLink: (
      <Action.OpenInBrowser
        key="openLink"
        title="Open Wiki Page"
        url={"https://stardewvalleywiki.com/" + name}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onOpen={() => {
          addRecentSymbol(props.symbol);
          props.refresh();
        }}
      />
    ),
    copyLink: (
      <Action.CopyToClipboard
        key="copyLink"
        title="Copy Wiki Page Link"
        content={"https://stardewvalleywiki.com/" + name}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onCopy={() => {
          addRecentSymbol(props.symbol);
          props.refresh();
        }}
      />
    ),
  };

  let order: JSX.Element[] = [];

  order = [actions["openLink"], actions["copyLink"]];

  return (
    <ActionPanel title={name}>
      {...order}
      <SaveActions {...props} />
    </ActionPanel>
  );
};
