import { IMenuItem } from "@taulo1999/kanpla-api";

interface IIcon {
  source: string;
  tintColor: string;
}

export function formatMarkdown(item: IMenuItem) {
  const menu = item?.menu?.name ?? "No menu";
  const photo = item?.photo ? `![](${item.photo}&w=300&h=200&fit=crop)` : "";

  return `###### ${item.name}
## ${menu}
${photo}`;
}

export function getIcon(item: string): IIcon {
  switch (item) {
    case "main":
      return {
        source: "beef.png",
        tintColor: "#FF6B35",
      };
    case "vegetarian":
      return {
        source: "salad.png",
        tintColor: "#4CAF50",
      };
    default:
      return {
        source: "utensils.png",
        tintColor: "#FFFFF",
      };
  }
}
