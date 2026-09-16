import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  List,
  PopToRootType,
  Toast,
  closeMainWindow,
  open,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ACCESSIBILITY_SETTINGS_URL,
  AccessibilityError,
  AppWindow,
  SCREEN_RECORDING_SETTINGS_URL,
  captureThumbnail,
  focusWindow,
  listWindows,
} from "./macos-windows";
import { filterWindowsByAppQuery, hasMatchingApp } from "./match-app";

type WindowGroup = {
  key: string;
  title: string;
  windows: AppWindow[];
};

function groupWindows(windows: AppWindow[]): WindowGroup[] {
  const groups = new Map<string, AppWindow[]>();

  for (const window of windows) {
    const key = window.bundleId || window.appName;
    const existing = groups.get(key);
    if (existing) {
      existing.push(window);
    } else {
      groups.set(key, [window]);
    }
  }

  return [...groups.entries()]
    .map(([key, groupedWindows]) => ({
      key,
      title: groupedWindows[0].localizedName || groupedWindows[0].appName,
      windows: groupedWindows,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function windowTitle(window: AppWindow): string {
  const titled = window.title.trim();
  if (titled) {
    return titled;
  }
  if (window.width && window.height) {
    return `Window ${window.index} · ${window.width}×${window.height}`;
  }
  return `Window ${window.index}`;
}

function windowKey(window: AppWindow): string {
  return `${window.bundleId}:${window.windowId ?? window.unixId}:${window.index}:${window.title}`;
}

function windowIcon(window: AppWindow) {
  if (window.appPath) {
    return { fileIcon: window.appPath };
  }
  return Icon.AppWindow;
}

function fileUrlFromPath(filePath: string): string {
  return `file://${filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function windowDetailMarkdown(window: AppWindow): string {
  if (window.thumbnail) {
    return `![Window preview](${fileUrlFromPath(window.thumbnail)})`;
  }
  return "No preview yet. Grant Screen Recording to Lost if window thumbnails are missing.";
}

function useWindowList() {
  const [data, setData] = useState<AppWindow[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  const revalidate = useCallback(async () => {
    setIsLoading(true);
    try {
      const windows = await listWindows();
      setData(windows);
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void revalidate();
  }, [revalidate]);

  return { data, isLoading, error, revalidate };
}

function windowActions(window: AppWindow, revalidate: () => void) {
  return (
    <ActionPanel>
      <Action title="Focus Window" icon={Icon.AppWindow} onAction={() => focusAndDismiss(window)} />
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
      {!window.thumbnail && (
        <Action
          title="Open Screen Recording Settings"
          icon={Icon.Eye}
          onAction={() => open(SCREEN_RECORDING_SETTINGS_URL)}
        />
      )}
    </ActionPanel>
  );
}

async function focusAndDismiss(window: AppWindow) {
  try {
    await focusWindow(window);
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't focus window",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const appQuery = props.arguments.app?.trim() ?? "";
  const { data, isLoading, error, revalidate } = useWindowList();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [thumbLoading, setThumbLoading] = useState(false);

  const windows = useMemo(
    () =>
      (data ?? []).map((window) =>
        window.windowId && thumbs[window.windowId] ? { ...window, thumbnail: thumbs[window.windowId] } : window,
      ),
    [data, thumbs],
  );

  const filteredWindows = useMemo(() => filterWindowsByAppQuery(windows, appQuery), [windows, appQuery]);
  const groups = useMemo(() => groupWindows(filteredWindows), [filteredWindows]);
  const matchedApp = useMemo(() => hasMatchingApp(windows, appQuery), [windows, appQuery]);

  useEffect(() => {
    const selected = filteredWindows.find((window) => windowKey(window) === selectedKey) ?? filteredWindows[0];
    const windowId = selected?.windowId;
    if (!windowId || thumbs[windowId]) {
      setThumbLoading(false);
      return;
    }

    let cancelled = false;
    setThumbLoading(true);
    captureThumbnail(windowId).then((path) => {
      if (cancelled) {
        return;
      }
      if (path) {
        setThumbs((current) => ({ ...current, [windowId]: path }));
      }
      setThumbLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filteredWindows, selectedKey, thumbs]);

  if (error instanceof AccessibilityError || error?.name === "AccessibilityError") {
    return (
      <List searchBarPlaceholder="Search apps or window titles">
        <List.EmptyView
          icon={Icon.Warning}
          title="Accessibility permission required"
          description="Lost needs Accessibility access to focus windows."
          actions={
            <ActionPanel>
              <Action
                title="Open Accessibility Settings"
                icon={Icon.Gear}
                onAction={() => open(ACCESSIBILITY_SETTINGS_URL)}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error) {
    return (
      <List searchBarPlaceholder="Search apps or window titles">
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't list windows"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const emptyTitle = appQuery
    ? matchedApp
      ? `No windows for “${appQuery}”`
      : `No running app matches “${appQuery}”`
    : "No open windows";
  const emptyDescription = appQuery
    ? matchedApp
      ? "That app is running, but it has no windows to show."
      : "Press Enter after the app name, or try a shorter name like chrome or teams."
    : "Type lost, press Enter, then search for an app or window title.";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSelectionChange={setSelectedKey}
      searchBarPlaceholder={appQuery ? `Filter ${appQuery} windows` : "Search apps or window titles"}
    >
      {groups.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.AppWindowList}
          title={emptyTitle}
          description={emptyDescription}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        groups.map((group) => (
          <List.Section key={group.key} title={group.title} subtitle={String(group.windows.length)}>
            {group.windows.map((window) => (
              <List.Item
                id={windowKey(window)}
                key={windowKey(window)}
                icon={windowIcon(window)}
                title={windowTitle(window)}
                subtitle={window.localizedName || window.appName}
                keywords={[window.appName, window.localizedName ?? "", window.bundleId]}
                detail={
                  <List.Item.Detail
                    isLoading={thumbLoading && !window.thumbnail}
                    markdown={windowDetailMarkdown(window)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="App"
                          text={window.localizedName || window.appName}
                          icon={window.appPath ? { fileIcon: window.appPath } : Icon.AppWindow}
                        />
                        {window.width && window.height ? (
                          <List.Item.Detail.Metadata.Label title="Size" text={`${window.width}×${window.height}`} />
                        ) : null}
                        {window.minimized ? <List.Item.Detail.Metadata.Label title="State" text="Minimized" /> : null}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={windowActions(window, revalidate)}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
