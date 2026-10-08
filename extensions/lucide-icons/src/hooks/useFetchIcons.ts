import { Cache } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { createLucideIcon } from "../createLucideIcon";
import { defaultAttributes } from "../defaultAttributes";
import { IconNodes, LucideIcon } from "../types";
import { toKebabCase, toPascalCase } from "../utils";

const DATA_STALE_TIME_IN_MILLISECONDS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Cache();

export function useFetchIcons() {
  const { data: iconNodes, isLoading: isLoadingIconNodes } = useFetch<IconNodes>("https://lucide.dev/api/icon-nodes");
  const { data: iconTags, isLoading: isLoadingIconTags } =
    useFetch<Record<string, string[]>>("https://lucide.dev/api/tags");
  const { data: iconCategories, isLoading: isLoadingIconCategories } = useFetch<Record<string, string[]>>(
    "https://lucide.dev/api/categories",
  );

  const isLoading = isLoadingIconNodes || isLoadingIconTags || isLoadingIconCategories;

  const data = useMemo(() => {
    if (!iconNodes || !iconTags || !iconCategories) return undefined;

    const cached = cache.get("icons");
    const lastFetchTime = Number(cache.get("lastFetchTime"));
    const currentTime = Date.now();

    // Check if data is cached and fetched less than 24 hours ago
    if (cached && lastFetchTime && currentTime - lastFetchTime < DATA_STALE_TIME_IN_MILLISECONDS) {
      return JSON.parse(cached) as LucideIcon[];
    }

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
  }, [iconNodes, iconTags, iconCategories]);

  return { data, isLoading };
}
