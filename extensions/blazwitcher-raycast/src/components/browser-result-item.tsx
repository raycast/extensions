import { Color, Icon, List } from "@raycast/api";
import {
  sourceNames,
  type BrowserEntry,
  type ChromeTabGroupColor,
  type Source,
} from "../types";
import { displayTitle } from "./preview-markdown";

const icons: Record<Source, Icon> = {
  tab: Icon.AppWindow,
  bookmark: Icon.Bookmark,
  history: Icon.Clock,
};
const tabGroupColors: Record<ChromeTabGroupColor, string> = {
  grey: "#9AA0A6",
  blue: "#1A73E8",
  red: "#D93025",
  yellow: "#F9AB00",
  green: "#188038",
  pink: "#E52592",
  purple: "#A142F4",
  cyan: "#01A9B4",
  orange: "#FA903E",
};

export function BrowserResultItem({
  entry,
  favicon,
  showDetail,
  detail,
  actions,
}: {
  entry: BrowserEntry;
  favicon?: string;
  showDetail: boolean;
  detail?: List.Item.Props["detail"];
  actions: List.Item.Props["actions"];
}) {
  return (
    <List.Item
      id={entry.id}
      icon={
        favicon
          ? { source: favicon, fallback: icons[entry.source] }
          : icons[entry.source]
      }
      title={{ value: displayTitle(entry.title), tooltip: entry.title }}
      subtitle={
        showDetail ? undefined : { value: entry.url, tooltip: entry.url }
      }
      accessories={showDetail ? undefined : resultAccessories(entry)}
      detail={detail}
      actions={actions}
    />
  );
}

function resultAccessories(entry: BrowserEntry) {
  const accessories: List.Item.Accessory[] = [];
  if (entry.source === "tab" && entry.tabGroup)
    accessories.push({
      tag: {
        value: entry.tabGroup.title || "标签组",
        color: tabGroupColors[entry.tabGroup.color],
      },
      tooltip: "Chrome 标签组",
    });
  if (entry.source === "tab" && entry.active)
    accessories.push({
      tag: { value: "当前标签", color: Color.Green },
    });
  if (entry.incognito)
    accessories.push({ icon: Icon.EyeDisabled, tooltip: "无痕标签" });
  if (entry.source === "history" && entry.visitedAt !== undefined) {
    const visited = new Date(entry.visitedAt);
    if (!Number.isNaN(visited.getTime()))
      accessories.push({
        date: visited,
        tooltip: `最近访问：${visited.toLocaleString("zh-CN", { hour12: false })}`,
      });
  }
  accessories.push({
    text: sourceNames[entry.source],
    tooltip: entry.profile?.name ?? "Chrome",
  });
  return accessories;
}
