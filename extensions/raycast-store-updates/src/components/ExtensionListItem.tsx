import { List, Icon, Color } from "@raycast/api";
import { StoreItem, FilterValue } from "../types";
import { FilterToggles } from "../hooks/useFilterToggles";
import { ExtensionItemDetail } from "./ExtensionItemDetail";
import { ExtensionActions } from "./ExtensionActions";

interface ExtensionListItemProps {
  item: StoreItem;
  filter: FilterValue;
  trackReadStatus: boolean;
  toggles: FilterToggles;
  onToggleMacOS: () => Promise<void>;
  onToggleWindows: () => Promise<void>;
  onToggleInstalledOnly: () => Promise<void>;
  onMarkAsRead?: (itemId: string) => Promise<void>;
  onMarkAllAsRead?: () => Promise<void>;
  onUndo?: () => Promise<void>;
}

export function ExtensionListItem({
  item,
  filter,
  trackReadStatus,
  toggles,
  onToggleMacOS,
  onToggleWindows,
  onToggleInstalledOnly,
  onMarkAsRead,
  onMarkAllAsRead,
  onUndo,
}: ExtensionListItemProps) {
  const showTypeTag = filter === "all";

  const accessories: List.Item.Accessory[] = [];

  // Always show platform icons so users remember which platforms are visible
  const hasMac = item.platforms?.some((p) => p.toLowerCase() === "macos") ?? true;
  const hasWindows = item.platforms?.some((p) => p.toLowerCase() === "windows") ?? false;
  if (hasMac) {
    accessories.push({ icon: { source: "platform-macos.svg", tintColor: "#0A64F0" }, tooltip: "macOS" });
  }
  if (hasWindows) {
    accessories.push({ icon: { source: "platform-windows.svg", tintColor: "#0078D7" }, tooltip: "Windows" });
  }

  if (showTypeTag) {
    accessories.push({
      icon: {
        source: item.type === "new" ? Icon.StarCircle : Icon.ArrowUpCircle,
        tintColor: item.type === "new" ? Color.Green : Color.Blue,
      },
      tooltip: item.type === "new" ? "New Extension" : "Updated Extension",
    });
  }

  return (
    <List.Item
      icon={{ source: item.image, fallback: Icon.Box }}
      title={item.title}
      accessories={accessories}
      detail={<ExtensionItemDetail item={item} />}
      actions={
        <ExtensionActions
          item={item}
          trackReadStatus={trackReadStatus}
          toggles={toggles}
          onToggleMacOS={onToggleMacOS}
          onToggleWindows={onToggleWindows}
          onToggleInstalledOnly={onToggleInstalledOnly}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onUndo={onUndo}
        />
      }
    />
  );
}
