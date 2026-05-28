import {
  Action,
  ActionPanel,
  Icon,
  List,
  closeMainWindow,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RunningApp,
  forceQuitApp,
  fuzzyFilter,
  getRunningApps,
  loadHidden,
  loadPinned,
  restartApp,
  saveHidden,
  savePinned,
} from "./lib";

const POLL_INTERVAL_MS = 500;

function sameApps(a: RunningApp[], b: RunningApp[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].bundleId !== b[i].bundleId) return false;
  }
  return true;
}

export default function Command() {
  const [apps, setApps] = useState<RunningApp[]>([]);
  const [hidden, setHidden] = useState<Map<string, RunningApp>>(new Map());
  const [pinned, setPinned] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const refreshing = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const loaded = await getRunningApps();
      setApps((prev) => (sameApps(prev, loaded) ? prev : loaded));
    } catch {
      // swallow polling errors to avoid toast spam; manual refresh will surface real failures
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    Promise.all([getRunningApps(), loadHidden(), loadPinned()])
      .then(([loaded, hiddenMap, pinnedIds]) => {
        setApps(loaded);
        setHidden(hiddenMap);
        setPinned(pinnedIds);
      })
      .catch((err) =>
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load apps",
          message: String(err),
        }),
      )
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const { pinnedItems, otherItems } = useMemo(() => {
    const visible = apps.filter((a) => !hidden.has(a.bundleId));
    const byId = new Map(visible.map((a) => [a.bundleId, a]));
    const pinnedSet = new Set(pinned);
    const pinnedItems = pinned
      .map((id) => byId.get(id))
      .filter((a): a is RunningApp => Boolean(a));
    const otherItems = visible.filter((a) => !pinnedSet.has(a.bundleId));
    return { pinnedItems, otherItems };
  }, [apps, hidden, pinned]);

  const pinnedFiltered = useMemo(
    () => fuzzyFilter(pinnedItems, searchText, (a) => a.name),
    [pinnedItems, searchText],
  );
  const otherFiltered = useMemo(
    () => fuzzyFilter(otherItems, searchText, (a) => a.name),
    [otherItems, searchText],
  );

  async function hideApp(app: RunningApp) {
    const next = new Map(hidden);
    next.set(app.bundleId, app);
    setHidden(next);
    await saveHidden(next);
    // unpinning happens implicitly via filter, but persist that too so it doesn't reappear when unhidden
    if (pinned.includes(app.bundleId)) {
      const nextPinned = pinned.filter((id) => id !== app.bundleId);
      setPinned(nextPinned);
      await savePinned(nextPinned);
    }
    await showToast({
      style: Toast.Style.Success,
      title: `Hidden ${app.name}`,
    });
  }

  async function pinApp(app: RunningApp) {
    if (pinned.includes(app.bundleId)) return;
    const next = [...pinned, app.bundleId];
    setPinned(next);
    await savePinned(next);
  }

  async function unpinApp(app: RunningApp) {
    const next = pinned.filter((id) => id !== app.bundleId);
    setPinned(next);
    await savePinned(next);
  }

  async function movePin(app: RunningApp, direction: -1 | 1) {
    const idx = pinned.indexOf(app.bundleId);
    if (idx === -1) return;
    const target = idx + direction;
    if (target < 0 || target >= pinned.length) return;
    const next = [...pinned];
    [next[idx], next[target]] = [next[target], next[idx]];
    setPinned(next);
    await savePinned(next);
  }

  function renderItem(app: RunningApp, isPinned: boolean) {
    const icon = app.path ? { fileIcon: app.path } : Icon.AppWindow;
    const idx = isPinned ? pinned.indexOf(app.bundleId) : -1;
    const canMoveUp = isPinned && idx > 0;
    const canMoveDown = isPinned && idx >= 0 && idx < pinned.length - 1;

    return (
      <List.Item
        key={app.bundleId}
        title={app.name}
        subtitle={app.bundleId || undefined}
        icon={icon}
        accessories={isPinned ? [{ icon: Icon.Tack }] : undefined}
        actions={
          <ActionPanel>
            <Action
              title="Restart"
              icon={Icon.RotateClockwise}
              onAction={async () => {
                await closeMainWindow();
                await restartApp(app);
              }}
            />
            <Action
              title="Force Quit"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={async () => {
                await closeMainWindow();
                await forceQuitApp(app);
              }}
            />
            <Action
              title="Restart (Keep Window Open)"
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["shift"], key: "return" }}
              onAction={async () => {
                await restartApp(app);
                refresh();
              }}
            />
            <Action
              title="Force Quit (Keep Window Open)"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onAction={async () => {
                await forceQuitApp(app);
                refresh();
              }}
            />
            {isPinned ? (
              <Action
                title="Unpin"
                icon={Icon.TackDisabled}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => unpinApp(app)}
              />
            ) : (
              <Action
                title="Pin"
                icon={Icon.Tack}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => pinApp(app)}
              />
            )}
            {canMoveUp && (
              <Action
                title="Move Pin up"
                icon={Icon.ArrowUp}
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                onAction={() => movePin(app, -1)}
              />
            )}
            {canMoveDown && (
              <Action
                title="Move Pin Down"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                onAction={() => movePin(app, 1)}
              />
            )}
            <Action
              title="Hide from List"
              icon={Icon.EyeDisabled}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
              onAction={() => hideApp(app)}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => refresh()}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search running apps…"
    >
      {pinnedFiltered.length > 0 && (
        <List.Section title="Pinned">
          {pinnedFiltered.map((app) => renderItem(app, true))}
        </List.Section>
      )}
      <List.Section title={pinnedFiltered.length > 0 ? "Running" : undefined}>
        {otherFiltered.map((app) => renderItem(app, false))}
      </List.Section>
    </List>
  );
}
