import { Action, Icon } from "@raycast/api";
import { MenuBarStore } from "./menubar-store";

export function MenuBarAddRemoveAction({
  menuBarSymbols,
  menuBarStore,
  symbol,
}: {
  menuBarSymbols: string[];
  menuBarStore: MenuBarStore;
  symbol: string;
}) {
  if (!menuBarSymbols.includes(symbol)) {
    return (
      <Action
        title="Add to Menu Bar"
        icon={Icon.Pin}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        onAction={() => menuBarStore.add(symbol)}
      />
    );
  }
  return (
    <Action
      title="Remove from Menu Bar"
      icon={Icon.PinDisabled}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      onAction={() => menuBarStore.remove(symbol)}
    />
  );
}
