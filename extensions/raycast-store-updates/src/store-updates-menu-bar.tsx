import { Icon, Keyboard, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { StoreItem } from "./types";
import {
  changelogUrl,
  createStoreDeeplink,
  extensionIconImage,
  getInstalledExtensionSlugs,
  scanStoreUpdates,
} from "./utils";
import { getStoredItemsSync, storeItems, getLastSeen, setLastSeen } from "./utils/store-cache";

const MAX_ITEMS = 12;
/** How far back a first run counts as "unseen", so the badge isn't empty on install. */
const FIRST_RUN_LOOKBACK_MS = 24 * 60 * 60 * 1000;

/**
 * The ⌥-held variant of a menu item: opens the extension's changelog instead of its
 * Store page. Returns undefined when the slug is unknown, which drops the alternate
 * rather than offering an action that would 404.
 *
 * Binding `slug` to a const narrows it for the closure — TypeScript does not carry the
 * `item.extensionSlug` truthiness check into the callback, and this avoids a `!`.
 */
function changelogAlternate(item: StoreItem) {
  const slug = item.extensionSlug;
  if (!slug) return undefined;
  return (
    <MenuBarExtra.Item
      icon={Icon.Document}
      title={item.title}
      subtitle="Changelog"
      onAction={async () => {
        try {
          // Open the changelog INSIDE Raycast by deep-linking the view command, which
          // reads this context on mount and pushes ChangelogDetail.
          await launchCommand({
            name: "view-store-updates",
            type: LaunchType.UserInitiated,
            context: { changelogSlug: slug, changelogTitle: item.title },
          });
        } catch {
          // launchCommand throws if the target command is disabled. Falling back to
          // GitHub keeps the action useful instead of silently doing nothing.
          await open(changelogUrl(slug));
        }
      }}
    />
  );
}

export default function Command() {
  // Seed from the synchronous Cache so the first render already has real data.
  const [items, setItems] = useState<StoreItem[]>(() => getStoredItemsSync());
  const [isLoading, setIsLoading] = useState(() => items.length === 0);
  const [lastSeen, setLastSeenState] = useState<number>(() => getLastSeen());

  async function scan() {
    try {
      const fresh = await scanStoreUpdates();
      setItems(fresh);
      storeItems(fresh);

      // On first ever run, seed the watermark to a lookback window rather than to
      // `now`. Seeding to `now` marks every already-published item as seen, so a fresh
      // install shows an empty menu bar until the next extension happens to ship —
      // technically correct, and indistinguishable from "the feature is broken".
      // A 24h lookback means the badge is populated immediately with genuinely recent
      // activity, which is what the command is for.
      if (getLastSeen() === 0) {
        const seeded = Date.now() - FIRST_RUN_LOOKBACK_MS;
        setLastSeen(seeded);
        setLastSeenState(seeded);
      }
    } catch (error) {
      console.error("[MenuBar] Store updates scan failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    scan();
  }, []);

  // Scope preference: "my-updates" narrows the menu bar to extensions the user actually
  // has installed, mirroring the My Updates filter in the main list. Only UPDATES can be
  // scoped that way — a "new" extension is by definition not installed yet, so including
  // new items under this scope would contradict the filter it is named after.
  const scope = getPreferenceValues<Preferences>().menuBarScope ?? "all";
  const scoped =
    scope === "my-updates"
      ? (() => {
          const installed = getInstalledExtensionSlugs();
          return items.filter(
            (item) => item.type === "updated" && item.extensionSlug && installed.has(item.extensionSlug),
          );
        })()
      : items;

  const unseen = scoped.filter((item) => new Date(item.date).getTime() > lastSeen);
  const count = unseen.length;
  const title = count > 0 ? `${count}` : undefined;
  const tooltip = isLoading
    ? "Checking the Raycast Store…"
    : count > 0
      ? `${count} new or updated extension${count !== 1 ? "s" : ""}`
      : "No new store updates";

  const markAllSeen = () => {
    // Seed from 0, not Date.now(): Date.now() always wins the Math.max, so the watermark
    // jumped to "now" and silently marked items seen that were never in the scoped list
    // (e.g. a brand-new extension while the menu bar was scoped to My Updates).
    const newest = scoped.reduce((max, item) => Math.max(max, new Date(item.date).getTime()), 0);
    if (newest === 0) return;
    setLastSeen(newest);
    setLastSeenState(newest);
  };

  const shown = (count > 0 ? unseen : scoped).slice(0, MAX_ITEMS);

  return (
    <MenuBarExtra icon="store-updates-icon.png" title={title} tooltip={tooltip} isLoading={isLoading}>
      {scoped.length === 0 && !isLoading && (
        <MenuBarExtra.Item
          title={scope === "my-updates" ? "No updates for your extensions" : "No store updates"}
          icon={Icon.CheckCircle}
        />
      )}

      {shown.length > 0 && (
        <MenuBarExtra.Section title={count > 0 ? "New & Updated" : "Recent"}>
          {shown.map((item) => (
            <MenuBarExtra.Item
              key={item.id}
              // The extension's own icon, identical to the main list (shared helper).
              // New/Updated stays in the subtitle, so no signal is lost to the swap.
              icon={extensionIconImage(item)}
              title={item.title}
              subtitle={item.type === "new" ? "New" : "Updated"}
              onAction={() => open(createStoreDeeplink(item.url))}
              // Hold ⌥ to open the changelog instead of the Store page. `alternate` is
              // Raycast's built-in option-key swap (macOS Sonoma+); on older macOS the
              // alternate is simply never shown and the default action still works.
              // Only offered when we know the slug — no slug, no changelog URL.
              alternate={changelogAlternate(item)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Separator />

      {count > 0 && <MenuBarExtra.Item title="Mark All as Seen" icon={Icon.CheckCircle} onAction={markAllSeen} />}
      <MenuBarExtra.Item
        title="View Store Updates"
        icon={Icon.AppWindowGrid3x3}
        onAction={() => launchCommand({ name: "view-store-updates", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="Refresh"
        icon={Icon.ArrowClockwise}
        // Common.Refresh, not a bare {cmd+r}: this extension ships to Windows, where
        // cmd does not exist. The Common constant is platform-aware by construction.
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={scan}
      />
    </MenuBarExtra>
  );
}
