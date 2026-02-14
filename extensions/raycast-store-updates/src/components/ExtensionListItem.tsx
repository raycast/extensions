import { List, Icon, Color } from "@raycast/api";
import { StoreItem, FilterValue } from "../types";
import { ExtensionItemDetail } from "./ExtensionItemDetail";
import { ExtensionActions } from "./ExtensionActions";

export function ExtensionListItem({
  item,
  filter,
  platformFilter,
}: {
  item: StoreItem;
  filter: FilterValue;
  platformFilter: string;
}) {
  const showTypeTag = filter === "all";

  const accessories: List.Item.Accessory[] = [];

  // Show platform icons only when preference is set to "All Platforms"
  if (platformFilter === "all") {
    const hasMac = item.platforms?.some((p) => p.toLowerCase() === "macos") ?? true;
    const hasWindows = item.platforms?.some((p) => p.toLowerCase() === "windows") ?? false;
    if (hasMac) {
      accessories.push({ icon: { source: "platform-macos.svg" }, tooltip: "macOS" });
    }
    if (hasWindows) {
      accessories.push({ icon: { source: "platform-windows.svg" }, tooltip: "Windows" });
    }
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
      actions={<ExtensionActions item={item} />}
    />
  );
}
