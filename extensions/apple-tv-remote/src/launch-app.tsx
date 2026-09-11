import { Action, ActionPanel, Grid, Icon, LaunchType, popToRoot, showHUD } from "@raycast/api";
import { createDeeplink, useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { launchApp, listApps } from "./lib/companion-extras";
import { withConnection } from "./lib/connection";
import { KNOWN_APPS, loadCachedApps, saveCachedApps } from "./lib/deep-links";
import { showErrorToast } from "./lib/errors";

interface AppEntry {
  bundleId: string;
  name: string;
}

function recordToEntries(apps: Record<string, string>): AppEntry[] {
  return Object.entries(apps)
    .map(([bundleId, name]) => ({ bundleId, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const FALLBACK_APPS: AppEntry[] = KNOWN_APPS.map((app) => ({ bundleId: app.bundleId, name: app.name })).sort((a, b) =>
  a.name.localeCompare(b.name),
);

export default function LaunchAppCommand() {
  // Seed instantly from cache so the grid renders without waiting on the device.
  const cached = useCachedPromise(loadCachedApps, [], { keepPreviousData: true });
  const [apps, setApps] = useState<AppEntry[] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const erroredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const live = await withConnection((conn) => listApps(conn));
        if (cancelled) return;
        setApps(recordToEntries(live));
        await saveCachedApps(live);
      } catch (error) {
        if (cancelled) return;
        // Fall back to the known-app list and surface the failure exactly once.
        setApps((prev) => prev ?? FALLBACK_APPS);
        if (!erroredRef.current) {
          erroredRef.current = true;
          await showErrorToast(error);
        }
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    }

    void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  async function open(entry: AppEntry) {
    try {
      await withConnection((conn) => launchApp(conn, entry.bundleId));
      await showHUD(`Opened ${entry.name}`);
      await popToRoot();
    } catch (error) {
      await showErrorToast(error);
    }
  }

  // Prefer live results, then cached, then the static fallback.
  const cachedEntries = cached.data ? recordToEntries(cached.data.apps) : undefined;
  const items = apps ?? cachedEntries ?? FALLBACK_APPS;
  const isLoading = (cached.isLoading || isRefreshing) && apps === null;

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Search Apple TV apps...">
      <Grid.EmptyView
        icon={Icon.AppWindow}
        title="No matching apps"
        description="Try a different search, or open an app by its bundle ID."
      />
      {items.map((entry) => (
        <Grid.Item
          key={entry.bundleId}
          content={Icon.AppWindow}
          title={entry.name}
          subtitle={entry.bundleId}
          actions={
            <ActionPanel>
              <Action title="Open on Apple TV" icon={Icon.Monitor} onAction={() => open(entry)} />
              {/* Saved quicklinks accept their own global hotkey/alias, one keystroke to any app. */}
              <Action.CreateQuicklink
                title="Save as Quicklink (Hotkey-Able)"
                quicklink={{
                  name: `Open ${entry.name} on Apple TV`,
                  link: createDeeplink({
                    command: "ask",
                    launchType: LaunchType.Background,
                    arguments: { query: `open ${entry.name.toLowerCase()}` },
                  }),
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
