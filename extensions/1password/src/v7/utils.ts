import { Cache, Icon } from "@raycast/api";
import { sync } from "fast-glob";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

import { V7Category, V7Item } from "./types";

const cache = new Cache();
const ITEMS_CACHE_NAME = "@items";

export function getV7CategoryIcon(categoryUUID: string) {
  switch (categoryUUID) {
    case "001":
      return Icon.Fingerprint;
    case "002":
      return Icon.CreditCard;
    case "003":
      return Icon.Document;
    case "004":
      return Icon.Person;
    case "005":
      return Icon.Key;
    case "006":
      return Icon.Paperclip;
    case "100":
      return Icon.CodeBlock;
    case "102":
      return Icon.HardDrive;
    case "103":
      return Icon.Car;
    case "112":
      return Icon.Code;

    default:
      return Icon.Lock;
  }
}
export function getV7Items(): undefined | { [key: string]: V7Category } {
  if (cache.has(ITEMS_CACHE_NAME)) {
    const items = cache.get(ITEMS_CACHE_NAME);

    return JSON.parse(items as string);
  }

  const path = `${homedir()}/Library/Containers/com.agilebits.onepassword7/Data/Library/Caches/Metadata/1Password`;

  try {
    const items: V7Item[] = sync(`${path}/**/*.onepassword-item-metadata`, { deep: 2, onlyFiles: false })
      .map((file) => JSON.parse(readFileSync(file, "utf-8").toString()))
      .sort((a, b) => a.itemTitle.localeCompare(b.itemTitle));
    const categories: { [key: string]: V7Category } = items.reduce((section: { [key: string]: V7Category }, item) => {
      const { categorySingularName, categoryUUID } = item;

      section[categorySingularName] = section[categorySingularName] ?? {
        id: categoryUUID,
        items: [],
        name: categorySingularName,
      };
      section[categorySingularName]["items"].push(item);
      return section;
    }, {});

    cache.set(ITEMS_CACHE_NAME, JSON.stringify(categories));

    return categories;
  } catch (error) {
    console.error(error);
  }
}
