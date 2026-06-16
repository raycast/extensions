import { List, Icon, Color } from "@raycast/api";
import { StoreItem, FilterValue } from "../types";
import { MACOS_TINT_COLOR, WINDOWS_TINT_COLOR } from "../utils";
import { FilterToggles } from "../hooks/useFilterToggles";
import { ExtensionItemDetail } from "./ExtensionItemDetail";
import { ExtensionActions } from "./ExtensionActions";

interface ExtensionListItemProps {
  item: StoreItem;
  items: StoreItem[];
  currentIndex: number;
  filter: FilterValue;
  trackReadStatus: boolean;
  toggles: FilterToggles;
  onToggleMacOS: () => Promise<void>;
  onToggleWindows: () => Promise<void>;
  onMarkAsRead?: (itemId: string) => Promise<void>;
  onMarkAllAsRead?: () => Promise<void>;
  onUndo?: () => Promise<void>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ExtensionListItem({
  item,
  items,
  currentIndex,
  filter,
  trackReadStatus,
  toggles,
  onToggleMacOS,
  onToggleWindows,
  onMarkAsRead,
  onMarkAllAsRead,
  onUndo,
  onRefresh,
  isRefreshing,
}: ExtensionListItemProps) {
  const showTypeTag = filter === "all";

  const accessories: List.Item.Accessory[] = [];

  // Always show platform icons so users remember which platforms are visible
  // Removed extensions don't have reliable platform data, so skip those icons
  if (item.type !== "removed") {
    const hasMac = item.platforms?.some((p) => p.toLowerCase() === "macos") ?? true;
    const hasWindows = item.platforms?.some((p) => p.toLowerCase() === "windows") ?? false;
    if (hasMac) {
      accessories.push({ icon: { source: "platform-macos.svg", tintColor: MACOS_TINT_COLOR }, tooltip: "macOS" });
    }
    if (hasWindows) {
      accessories.push({ icon: { source: "platform-windows.svg", tintColor: WINDOWS_TINT_COLOR }, tooltip: "Windows" });
    }
  }

  if (showTypeTag) {
    const typeIcon =
      item.type === "removed"
        ? { source: Icon.MinusCircle, tintColor: Color.Red }
        : item.type === "new"
          ? { source: Icon.StarCircle, tintColor: Color.Green }
          : { source: Icon.ArrowUpCircle, tintColor: Color.Blue };
    const typeTooltip =
      item.type === "removed" ? "Removed Extension" : item.type === "new" ? "New Extension" : "Updated Extension";
    accessories.push({ icon: typeIcon, tooltip: typeTooltip });
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
          items={items}
          currentIndex={currentIndex}
          trackReadStatus={trackReadStatus}
          toggles={toggles}
          onToggleMacOS={onToggleMacOS}
          onToggleWindows={onToggleWindows}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onUndo={onUndo}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      }
    />
  );
}
