import { Icon, List } from "@raycast/api";
import type { Instance } from "../types";

/**
 * Mod loader shown next to the instance name
 */
export function getInstanceSubtitle(instance: Instance): string | undefined {
  return instance.loader;
}

/**
 * Minecraft version plus the favorite star, shown at the end of an instance row
 */
export function getInstanceAccessories(instance: Instance): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (instance.minecraftVersion) {
    const loader = instance.loaderVersion ? `${instance.loader} ${instance.loaderVersion}` : instance.loader;
    accessories.push({
      tag: instance.minecraftVersion,
      tooltip: loader ? `Minecraft ${instance.minecraftVersion} · ${loader}` : `Minecraft ${instance.minecraftVersion}`,
    });
  }

  if (instance.favorite) accessories.push({ icon: Icon.Star, tooltip: "Favorited" });

  return accessories;
}

/**
 * Let instances be found by typing a version or loader name, not just the instance name
 */
export function getInstanceKeywords(instance: Instance): string[] {
  return [instance.minecraftVersion, instance.loader].filter((keyword): keyword is string => Boolean(keyword));
}
