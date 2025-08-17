import { Action, ActionPanel, Color, Grid, Icon, environment, getPreferenceValues } from "@raycast/api";
import { readFileSync } from "node:fs";
import React, { useEffect, useState } from "react";
import { SaveActions, addRecentSymbol, getPinnedSymbols, getRecentSymbols } from "./storage";

export interface Preferences {
  primaryAction: "copySymbol" | "pasteSymbol" | "copyName" | "pasteName";
  gridColumns: string;
  showName: boolean;
  minimumVersionOS: "iOS" | "macOS" | "watchOS" | "tvOS" | "visionOS" | "disabled";
}

export type sfsymbol = {
  name: string;
  symbol: string;
  categories: string[];
  searchTerms: string[];
  availableFrom: number;
};

export type category = {
  name: string;
  title: string;
  symbol: string;
};

export type version = {
  iOS: string;
  macOS: string;
  tvOS: string;
  visionOS: string;
  watchOS: string;
};

export interface SymbolProps {
  symbol: sfsymbol;
  refresh: () => void;
  pinned?: boolean;
  recent?: boolean;
}

const { primaryAction, gridColumns, showName, minimumVersionOS }: Preferences = getPreferenceValues();

function getDataPath() {
  return `${environment.assetsPath}/symbols/data.json`;
}

function getImageURL(name: string) {
  return `https://raw.githubusercontent.com/ndckj/sf-symbols/main/images/100/${name}.png`;
}

const data: {
  symbols: sfsymbol[];
  categories: category[];
  versions: { [key: string]: version };
} = JSON.parse(readFileSync(getDataPath(), { encoding: "utf8" }));

export default function Command() {
  const [category, setCategory] = useState<string>();
  const [pinned, setPinned] = useState<sfsymbol[]>([]);
  const [recent, setRecent] = useState<sfsymbol[]>([]);
  const [refreshState, setRefreshState] = useState(false);
  const refresh = () => setRefreshState(!refreshState);

  useEffect(() => {
    setPinned(getPinnedSymbols());
    setRecent(getRecentSymbols());
  }, [refreshState]);

  const filteredSymbols =
    category && category !== "all" ? data.symbols.filter((s) => s.categories.includes(category)) : data.symbols;

  return (
    <Grid
      isLoading={category === undefined}
      searchBarPlaceholder="Search SF Symbols..."
      inset={Grid.Inset.Large}
      columns={Number(gridColumns)}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select SF sfsymbol category"
          storeValue={true}
          onChange={(newValue) => setCategory(newValue)}
        >
          <Grid.Dropdown.Item
            value={data.categories[0].name}
            title="All Categories"
            icon={{
              source: getImageURL(data.categories[0].symbol),
              fallback: Icon.Warning,
              tintColor: Color.PrimaryText,
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
                  tintColor: Color.PrimaryText,
                }}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {category && (
        <React.Fragment>
          <Grid.Section title="Pinned">
            {pinned
              .filter((s) => category === "all" || s.categories.includes(category))
              .map((symbol: sfsymbol, index: number) => (
                <SFSymbol key={index} symbol={symbol} refresh={refresh} pinned />
              ))}
          </Grid.Section>
          <Grid.Section title="Recently Used">
            {recent
              .filter((s) => category === "all" || s.categories.includes(category))
              .map((symbol: sfsymbol, index: number) => (
                <SFSymbol key={index} symbol={symbol} refresh={refresh} recent />
              ))}
          </Grid.Section>
          <Grid.Section title={recent.length + pinned.length > 0 ? "All Symbols" : undefined}>
            {filteredSymbols.map((symbol: sfsymbol, index: number) => (
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

  let subtitle;
  if (minimumVersionOS != "disabled" && symbol.availableFrom) {
    subtitle = `${minimumVersionOS} ${data.versions[symbol.availableFrom][minimumVersionOS]}`;
  } else {
    subtitle = undefined;
  }

  return (
    <Grid.Item
      title={showName ? symbol.name : undefined}
      subtitle={subtitle}
      content={{
        tooltip: symbol.name,
        value: {
          source: getImageURL(symbol.name),
          fallback: Icon.Warning,
          tintColor: Color.PrimaryText,
        },
      }}
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
        shortcut={{ modifiers: ["shift", "opt"], key: "v" }}
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
        shortcut={{ modifiers: ["shift", "opt"], key: "c" }}
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
