import { createLucideIcon } from "./create-lucide-icon";
import { defaultAttributes } from "./default-attributes";
import fetch from "node-fetch";
import { Cache } from "@raycast/api";
import { toKebabCase, toPascalCase } from "./utils";

type IconNodes = Record<string, IconNode>;
export type IconNode = [elementName: string, attrs: Record<string, string>][];

type LucideIcon = {
  name: string;
  content: string;
  path: string;
  component: string;
  keywords: string[];
};

const DATA_STALE_TIME_IN_MILLISECONDS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Cache();

export async function fetchIcons() {
  const cached = cache.get("icons");
  const lastFetchTime = Number(cache.get("lastFetchTime"));
  const currentTime = Date.now();

  // Check if data is cached and fetched less than 24 hours ago
  if (cached && lastFetchTime && currentTime - lastFetchTime < DATA_STALE_TIME_IN_MILLISECONDS) {
    return JSON.parse(cached) as LucideIcon[];
  }

  const iconNodes = await fetch("https://lucide.dev/api/icon-nodes").then((res) => res.json() as Promise<IconNodes>);

  const iconTags = await fetch("https://lucide.dev/api/tags").then(
    (res) => res.json() as Promise<Record<string, string[]>>,
  );

  const iconCategories = await fetch("https://lucide.dev/api/categories").then(
    (res) => res.json() as Promise<Record<string, string[]>>,
  );

  const icons = Object.entries(iconNodes).map(([iconName, iconNode]): LucideIcon => {
    const content = createLucideIcon(
      "svg",
      {
        ...defaultAttributes,
        class: `lucide lucide-${toKebabCase(iconName)}`,
      },
      iconNode.map((node) => createLucideIcon(node[0], node[1])),
    );

    return {
      name: iconName,
      content,
      path: `https://lucide.dev/api/icons/${iconName}`,
      component: `<${toPascalCase(iconName)} />`,
      keywords: [...iconTags[iconName], ...iconCategories[iconName]],
    };
  });

  // Cache the icons and the current timestamp
  cache.set("icons", JSON.stringify(icons));
  cache.set("lastFetchTime", JSON.stringify(currentTime));
  return icons;
}
