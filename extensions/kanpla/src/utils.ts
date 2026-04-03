import { IMenuItem } from "@taulo1999/kanpla-api";

export function formatMarkdown(item: IMenuItem) {
  const menu = item?.menu?.name ?? "No menu";
  const photo = item?.photo ? `![](${item.photo}&w=300&h=200&fit=crop)` : "";

  return `###### ${item.name}
## ${menu}
${photo}`;
}
