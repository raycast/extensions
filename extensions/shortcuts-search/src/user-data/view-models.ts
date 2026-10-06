import { supportsPlatform } from "../shortcut-core/platforms";
import type { Platform } from "../load/platform";
import type { AppMetadata } from "../model/input/input-models";
import type { Favorite, UserCustomizations } from "./models";

export type AppsFilter = "all" | "customized" | "favorites";

export function mergeAppMetadata(
  baseApps: AppMetadata[],
  customizations: UserCustomizations | undefined,
  platform?: Platform
): AppMetadata[] {
  if (!customizations) return baseApps;

  return [
    ...baseApps,
    ...customizations.customApps
      .map((app) => ({
        name: app.name,
        slug: `custom-${app.slug}`,
        customAppId: app.id,
        bundleId: app.bundleId,
        windowsAppId: app.windowsAppId,
        windowsProcessName: app.windowsProcessName,
        hostname: app.hostname,
        source: app.source,
        icon: app.icon,
        keymaps: app.keymaps
          .filter((keymap) => !platform || supportsPlatform(keymap.platforms, platform))
          .map((keymap) => keymap.title),
      }))
      .filter((app) => app.keymaps.length > 0),
  ];
}

export function selectCustomizedApps(apps: AppMetadata[], customizations: UserCustomizations): AppMetadata[] {
  const customizedSlugs = new Set(
    customizations.customKeymaps.flatMap((keymap) => (keymap.baseAppSlug ? [keymap.baseAppSlug] : []))
  );
  for (const overlay of customizations.shortcuts) {
    customizedSlugs.add(overlay.baseKey.split(":", 1)[0]);
  }

  return apps.filter((app) => app.customAppId || customizedSlugs.has(app.slug));
}

export function selectAppsByFilter(
  apps: AppMetadata[],
  customizations: UserCustomizations | undefined,
  favorites: Favorite[],
  filter: AppsFilter
): AppMetadata[] {
  if (filter === "all") return apps;
  if (filter === "customized") return customizations ? selectCustomizedApps(apps, customizations) : [];

  const appFavorites = favorites.filter((favorite) => favorite.itemType === "app");
  return apps.filter((app) =>
    appFavorites.some(
      (favorite) =>
        (favorite.customAppId !== undefined && favorite.customAppId === app.customAppId) ||
        (favorite.customAppId === undefined && favorite.appSlug === app.slug)
    )
  );
}
