import { Action, ActionPanel, Cache, Icon, Color, showToast, Toast } from "@raycast/api";
import { sfsymbol, SymbolProps } from "./index";
import React from "react";

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

const clearPinnedSymbols = () => {
  storage.set("pinned", JSON.stringify([]));
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
            title="Remove Pinned Character"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            icon={Icon.PinDisabled}
            onAction={async () => {
              removePinnedSymbol(props.symbol);
              props.refresh();
              await showToast(Toast.Style.Success, "Removed Pinned Character");
            }}
          />
          <Action
            title="Clear All Pinned Characters"
            icon={{ source: Icon.XMarkCircleFilled, tintColor: Color.Red }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={async () => {
              clearPinnedSymbols();
              props.refresh();
              await showToast(Toast.Style.Success, "Pinned Characters Cleared");
            }}
          />
        </React.Fragment>
      ) : (
        <Action
          title="Pin Character"
          icon={Icon.Pin}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={async () => {
            addPinnedSymbol(props.symbol);
            props.refresh();
            await showToast(Toast.Style.Success, "Character Pinned");
          }}
        />
      )}
      {props.recent && (
        <React.Fragment>
          <Action
            title="Remove Recent Character"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              removeRecentSymbol(props.symbol);
              props.refresh();
              await showToast(Toast.Style.Success, "Removed Recent Character");
            }}
          />
          <Action
            title="Clear All Recent Characters"
            icon={{ source: Icon.XMarkCircleFilled, tintColor: Color.Red }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={async () => {
              clearRecentSymbols();
              props.refresh();
              showToast(Toast.Style.Success, "Recent Characters Cleared");
            }}
          />
        </React.Fragment>
      )}
    </ActionPanel.Section>
  );
};
