import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  LaunchType,
  List,
  closeMainWindow,
  getApplications,
  launchCommand,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ACCESSIBILITY_SETTINGS, openDockApp, resolvePaths, useIgnoredApps } from "./apps";
import { AccessibilityError, DockTile, readDockTiles } from "./dock";

/** macOS system red, as used for Dock badges. */
const BADGE_RED = "#FF3B30";

/** Re-run the menu bar command so its count reflects an ignore change right away. */
function refreshMenuBar() {
  return launchCommand({ name: "show-dock-badges", type: LaunchType.Background }).catch(() => {
    // The menu bar command may not be activated; it picks the change up on its next run anyway.
  });
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(readDockTiles, [], {
    keepPreviousData: true,
    // Errors are shown as the empty view; skip the default "Failed to fetch latest data" toast.
    onError: () => undefined,
  });
  const { data: applications } = useCachedPromise(getApplications, [], { keepPreviousData: true });
  const { isIgnored, isLoading: ignoredLoading, setIgnored } = useIgnoredApps(data);

  const tiles = (data ?? []).map((tile) => ({ tile, ...resolvePaths(tile, applications) }));
  const badged = tiles.filter(({ tile }) => tile.count > 0 && !isIgnored(tile));
  const ignoredTiles = tiles.filter(({ tile }) => isIgnored(tile));
  const total = badged.reduce((sum, { tile }) => sum + tile.count, 0);

  async function toggleIgnored(tile: DockTile) {
    await setIgnored(tile, !isIgnored(tile));
    await refreshMenuBar();
  }

  const row = ({ tile, iconPath, openPath }: (typeof tiles)[number]) => {
    const ignoredTile = isIgnored(tile);
    return (
      <List.Item
        key={`${tile.name}-${tile.ordinal}`}
        title={tile.name}
        icon={iconPath ? { fileIcon: iconPath } : Icon.AppWindow}
        accessories={
          tile.badge
            ? [{ tag: { value: tile.badge, color: ignoredTile ? Color.SecondaryText : BADGE_RED } }]
            : undefined
        }
        actions={
          <ActionPanel>
            <Action
              title={`Open ${tile.name}`}
              icon={Icon.ArrowRight}
              onAction={async () => {
                // Open first: once the window closes Raycast can unload the command before a slower
                // Dock-tile click has run.
                await openDockApp(tile, openPath);
                await closeMainWindow();
              }}
            />
            <Action
              title={ignoredTile ? "Stop Ignoring App" : "Ignore App"}
              icon={ignoredTile ? Icon.Eye : Icon.EyeDisabled}
              shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              onAction={() => toggleIgnored(tile)}
            />
            {iconPath && <Action.ShowInFinder path={iconPath} />}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading || ignoredLoading} searchBarPlaceholder="Filter apps">
      {error ? (
        error instanceof AccessibilityError ? (
          <List.EmptyView
            icon={Icon.Lock}
            title="Accessibility Permission Required"
            description="Allow Raycast in System Settings → Privacy & Security → Accessibility."
            actions={
              <ActionPanel>
                <Action.Open title="Open Accessibility Settings" target={ACCESSIBILITY_SETTINGS} />
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="Couldn't Read the Dock"
            description={error.message}
            actions={
              <ActionPanel>
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        )
      ) : (
        <>
          <List.EmptyView
            icon={Icon.Bell}
            title="No Notifications"
            description="No app in your Dock has a badge."
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
          <List.Section title="Notifications" subtitle={total > 0 ? String(total) : undefined}>
            {badged.map(row)}
          </List.Section>
          <List.Section title="Ignored" subtitle="Not counted in the menu bar">
            {ignoredTiles.map(row)}
          </List.Section>
        </>
      )}
    </List>
  );
}
