import { Action, ActionPanel, Alert, Cache, confirmAlert, Icon } from "@raycast/api";
import React from "react";
import { sfsymbol, SymbolProps } from "./index";

const storage = new Cache();

export const getPinnedSymbols = (): sfsymbol[] => {
  const data = storage.get("pinned");
  return data ? JSON.parse(data) : [];
};

export const getRecentSymbols = (): sfsymbol[] => {
  const data = storage.get("recent");
  return data ? JSON.parse(data).slice(0, 16) : [];
};

const addPinnedSymbol = (symbol: sfsymbol) => {
  removeRecentSymbol(symbol);
  const pinnedSymbols = getPinnedSymbols();
  storage.set("pinned", JSON.stringify([symbol, ...pinnedSymbols.filter((s) => s.name !== symbol.name)]));
};

export const addRecentSymbol = (symbol: sfsymbol) => {
  const pinnedSymbols = getPinnedSymbols();
  if (!pinnedSymbols.find((s) => s.name === symbol.name)) {
    const recentSymbols = getRecentSymbols();
    storage.set("recent", JSON.stringify([symbol, ...recentSymbols.filter((s) => s.name !== symbol.name)]));
  }
};

const removePinnedSymbol = (symbol: sfsymbol) => {
  const pinnedSymbols = getPinnedSymbols();
  storage.set("pinned", JSON.stringify(pinnedSymbols.filter((s) => s.name !== symbol.name)));
};

const removeRecentSymbol = (symbol: sfsymbol) => {
  const recentSymbols = getRecentSymbols();
  storage.set("recent", JSON.stringify(recentSymbols.filter((s) => s.name !== symbol.name)));
};

const clearRecentSymbols = () => {
  storage.set("recent", JSON.stringify([]));
};

export const SaveActions = (props: SymbolProps): JSX.Element => {
  return (
    <ActionPanel.Section>
      {props.pinned ? (
        <React.Fragment>
          <Action
            title="Unpin Symbol"
            shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
            icon={Icon.PinDisabled}
            onAction={async () => {
              removePinnedSymbol(props.symbol);
              props.refresh();
            }}
          />
        </React.Fragment>
      ) : (
        <Action
          title="Pin Symbol"
          icon={Icon.Pin}
          shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
          onAction={async () => {
            addPinnedSymbol(props.symbol);
            props.refresh();
          }}
        />
      )}
      {props.recent && (
        <React.Fragment>
          <Action
            title="Clear Recently Used Symbols"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            style={Action.Style.Destructive}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Clear recently used symbols?",
                message: "This action cannot be undone.",
                primaryAction: {
                  title: "Clear",
                  style: Alert.ActionStyle.Destructive,
                },
              });

              if (confirmed) {
                clearRecentSymbols();
                props.refresh();
              }
            }}
          />
        </React.Fragment>
      )}
    </ActionPanel.Section>
  );
};
