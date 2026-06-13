import { environment } from "@raycast/api";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LarkSearchItem, typeLabels } from "./types";

type Quicklink = {
  name: string;
  link: string;
  iconName?: string;
  openWith?: string;
};

const quicklinkIcons: Record<string, string> = {
  doc: "doc-16",
  message: "message-16",
  chat: "two-people-16",
  contact: "person-16",
  wiki: "book-16",
  sheet: "bar-chart-16",
};

export async function exportQuicklinks(
  items: LarkSearchItem[],
  limit: number,
  openWith: string,
) {
  const quicklinks = items
    .filter((item) => item.url)
    .sort((a, b) => {
      const openDelta = (b.openCount ?? 0) - (a.openCount ?? 0);
      if (openDelta !== 0) {
        return openDelta;
      }

      return (
        Date.parse(b.lastOpenedAt ?? "") - Date.parse(a.lastOpenedAt ?? "")
      );
    })
    .slice(0, limit)
    .map<Quicklink>((item) => ({
      name: `飞书 ${typeLabels[item.type]} ${item.title}`,
      link: item.url as string,
      iconName: quicklinkIcons[item.type],
      openWith: shouldOpenInLark(item) ? openWith : undefined,
    }));

  await mkdir(environment.supportPath, { recursive: true });
  const filePath = join(environment.supportPath, "lark-quicklinks.json");
  await writeFile(filePath, JSON.stringify(quicklinks, null, 2), "utf8");

  return { filePath, count: quicklinks.length };
}

function shouldOpenInLark(item: LarkSearchItem) {
  return (
    item.type === "chat" || item.type === "message" || item.type === "contact"
  );
}
