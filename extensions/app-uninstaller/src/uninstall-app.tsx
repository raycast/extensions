import { Action, ActionPanel, Icon, Keyboard, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listInstalledApps } from "./lib/apps";
import { formatAge, formatBytes } from "./lib/format";
import { measurePaths } from "./lib/size";
import { lastUsed, type Usage } from "./lib/usage";
import { groupApps, type ViewKey } from "./lib/views";
import { PermissionSetup } from "./components/PermissionSetup";
import { ReviewUninstall } from "./components/ReviewUninstall";

const SETUP_SEEN_KEY = "permission-setup-seen";

export default function Command() {
  // Every hook runs on every render, before any branch: a conditional return
  // placed above one changes the hook order between renders and corrupts React's
  // state for all of them.
  const { data: apps, isLoading, revalidate } = useCachedPromise(listInstalledApps, [], { initialData: [] });
  // Size first: the biggest bundles are what the list is usually opened for.
  const [view, setView] = useState<ViewKey>("size");

  // null while the stored flag is being read; true once the setup screen is done
  // with. Held here rather than re-read from storage, so dismissing it cannot
  // depend on a write succeeding or trigger a reload of this component.
  const [setupDone, setSetupDone] = useState<boolean | null>(null);
  const [autoDismissSetup, setAutoDismissSetup] = useState(true);

  useEffect(() => {
    let cancelled = false;
    LocalStorage.getItem<boolean>(SETUP_SEEN_KEY)
      .then((seen) => {
        if (!cancelled) setSetupDone(seen === true);
      })
      .catch(() => {
        if (!cancelled) setSetupDone(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const completeSetup = useCallback(() => {
    setSetupDone(true);
    void LocalStorage.setItem(SETUP_SEEN_KEY, true).catch(() => undefined);
  }, []);

  const reopenSetup = useCallback(() => {
    // Opened deliberately, so it should stay open even when nothing needs fixing.
    setAutoDismissSetup(false);
    setSetupDone(false);
  }, []);

  // A string, not an array: the cache compares arguments, and a fresh array of
  // the same paths must not count as a change or every render would start
  // another several-second measurement.
  const pathKey = useMemo(() => apps.map((app) => app.path).join("\n"), [apps]);

  const { data: sizes, isLoading: isMeasuring } = useCachedPromise(
    async (key: string): Promise<Record<string, number>> => (key ? measurePaths(key.split("\n")) : {}),
    [pathKey],
    { execute: pathKey.length > 0, initialData: {} as Record<string, number>, keepPreviousData: true },
  );

  // Reading when each app was last used is cheap next to measuring sizes: one
  // mdls call plus a stat per app that Spotlight has nothing for.
  const { data: usage } = useCachedPromise(
    async (key: string): Promise<Record<string, Usage>> => (key ? lastUsed(apps) : {}),
    [pathKey],
    { execute: pathKey.length > 0, initialData: {} as Record<string, Usage>, keepPreviousData: true },
  );

  const buckets = useMemo(() => groupApps(view, apps, sizes, usage), [view, apps, sizes, usage]);

  if (setupDone === null) {
    return <List isLoading searchBarPlaceholder="Loading…" />;
  }

  if (!setupDone) {
    return <PermissionSetup onDone={completeSetup} autoDismiss={autoDismissSetup} />;
  }

  return (
    <List
      isLoading={isLoading || isMeasuring}
      searchBarPlaceholder="Search installed applications…"
      searchBarAccessory={
        <List.Dropdown tooltip="View" value={view} onChange={(value) => setView(value as ViewKey)}>
          <List.Dropdown.Item value="name" title="All Applications" icon={Icon.Text} />
          <List.Dropdown.Item value="size" title="By Size" icon={Icon.HardDrive} />
          <List.Dropdown.Item value="lastUsed" title="By Last Used" icon={Icon.Clock} />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No applications found"
        description="Nothing removable was found in /Applications or ~/Applications."
      />
      {buckets.map((bucket) => (
        <List.Section
          key={bucket.title || "all"}
          title={bucket.title}
          subtitle={bucket.title ? `${bucket.apps.length}` : undefined}
        >
          {bucket.apps.map((app) => {
            const size = sizes[app.path];
            const used = usage[app.path];

            return (
              <List.Item
                key={app.path}
                icon={{ fileIcon: app.path }}
                title={app.name}
                subtitle={app.bundleId}
                accessories={[
                  ...(app.fromAppStore ? [{ icon: Icon.Cart, tooltip: "Installed from the Mac App Store" }] : []),
                  ...(view === "lastUsed"
                    ? [
                        {
                          text: used?.lastUsed ? formatAge(used.lastUsed) : "no sign of use",
                          tooltip:
                            used?.source === "spotlight"
                              ? "Last opened, according to Spotlight"
                              : used?.source === "activity"
                                ? "Estimated from when the app last wrote its preferences or data"
                                : "Neither Spotlight nor any app data suggests it has been opened",
                        },
                      ]
                    : app.version
                      ? [{ text: app.version, tooltip: "Version" }]
                      : []),
                  {
                    text: size ? formatBytes(size) : isMeasuring ? "…" : "—",
                    tooltip: "Size of the application bundle, before leftovers",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.Trash}
                      title="Review What Would Be Removed"
                      target={<ReviewUninstall app={app} allApps={apps} onFinished={revalidate} />}
                    />
                    <Action.ShowInFinder path={app.path} />
                    <Action.CopyToClipboard title="Copy Bundle Identifier" content={app.bundleId} />
                    <Action
                      icon={Icon.ArrowClockwise}
                      title="Refresh List"
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                    <Action
                      icon={Icon.Gear}
                      title="Permissions & Setup"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={reopenSetup}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
