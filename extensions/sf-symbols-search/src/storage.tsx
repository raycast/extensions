import { Action, ActionPanel, Alert, Cache, confirmAlert, Icon, Keyboard } from "@raycast/api";
import React, { useSyncExternalStore } from "react";
import { sfsymbol, SymbolProps } from "./types";

const storage = new Cache();

// Every mounted action panel (the grid, a pushed Family view, Show Info) shows Pin or Unpin from
// storage, so a pin made in one has to redraw the others.
let pinRevision = 0;
const pinListeners = new Set<() => void>();
const pinsChanged = () => {
  pinRevision += 1;
  pinListeners.forEach((listener) => listener());
};
const subscribeToPins = (listener: () => void) => {
  pinListeners.add(listener);
  return () => {
    pinListeners.delete(listener);
  };
};
const subscribeToNothing = () => () => {};
export const usePinRevision = () => useSyncExternalStore(subscribeToPins, () => pinRevision);

/** Whether a symbol is pinned, redrawing when that changes. Inactive callers (most grid tiles) don't subscribe. */
export const usePinned = (name: string, active: boolean): boolean => {
  useSyncExternalStore(active ? subscribeToPins : subscribeToNothing, () => pinRevision);
  return active && isPinnedSymbol(name);
};

export const getPinnedSymbols = (): sfsymbol[] => {
  const data = storage.get("pinned");
  return data ? JSON.parse(data) : [];
};

export const isPinnedSymbol = (name: string): boolean => getPinnedSymbols().some((symbol) => symbol.name === name);

export const getRecentSymbols = (): sfsymbol[] => {
  const data = storage.get("recent");
  return data ? JSON.parse(data).slice(0, 16) : [];
};

const addPinnedSymbol = (symbol: sfsymbol) => {
  removeRecentSymbol(symbol);
  const pinnedSymbols = getPinnedSymbols();
  storage.set("pinned", JSON.stringify([symbol, ...pinnedSymbols.filter((s) => s.name !== symbol.name)]));
  pinsChanged();
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
  pinsChanged();
};

const removeRecentSymbol = (symbol: sfsymbol) => {
  const recentSymbols = getRecentSymbols();
  storage.set("recent", JSON.stringify(recentSymbols.filter((s) => s.name !== symbol.name)));
};

const clearRecentSymbols = () => {
  storage.set("recent", JSON.stringify([]));
};

export const SaveActions = (props: SymbolProps): React.JSX.Element => {
  return (
    <ActionPanel.Section>
      {props.pinned ? (
        <React.Fragment>
          <Action
            title="Unpin Symbol"
            shortcut={Keyboard.Shortcut.Common.Pin}
            icon={Icon.TackDisabled}
            onAction={async () => {
              removePinnedSymbol(props.symbol);
              props.refresh();
            }}
          />
        </React.Fragment>
      ) : (
        <Action
          title="Pin Symbol"
          icon={Icon.Tack}
          shortcut={Keyboard.Shortcut.Common.Pin}
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
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
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
