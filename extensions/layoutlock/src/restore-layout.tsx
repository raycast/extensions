import { Action, ActionPanel, environment, getApplications, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  CorruptLayoutIndexError,
  canDispatchToLayoutLock,
  dispatchToLayoutLock,
  layoutLockDownloadURL,
  layoutLockRaycastURL,
  LayoutLockNotInstalledError,
  layoutIndexPath,
  layoutLockTarget,
  type LayoutSummary,
  makeRestoreURL,
  MissingLayoutIndexError,
  openLayoutLock,
  readLayoutIndex,
  UnsupportedLayoutIndexError,
} from "./layoutlock";

type LoadState =
  { status: "loading" } | { status: "ready"; layouts: LayoutSummary[] } | { status: "error"; error: Error };

export default function RestoreLayout() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  async function reload() {
    setState({ status: "loading" });
    try {
      const applications = await getApplications();
      const target = layoutLockTarget(environment.isDevelopment);
      if (!canDispatchToLayoutLock(applications, target, environment.isDevelopment)) {
        throw new LayoutLockNotInstalledError("LayoutLock is not installed.");
      }
      const index = await readLayoutIndex(layoutIndexPath(target));
      setState({ status: "ready", layouts: index.layouts });
    } catch (error) {
      setState({ status: "error", error: error instanceof Error ? error : new Error(String(error)) });
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const emptyState = emptyStateFor(state);

  return (
    <List isLoading={state.status === "loading"} searchBarPlaceholder="Search saved layouts…">
      {state.status === "ready" &&
        state.layouts.map((layout) => (
          <List.Item
            key={layout.id}
            icon={Icon.Desktop}
            title={layout.name}
            subtitle={`${layout.windowCount} windows · ${layout.appCount} apps · ${layout.displayCount} displays`}
            accessories={[{ date: new Date(layout.updatedAt), tooltip: "Last updated" }]}
            actions={
              <ActionPanel>
                <Action title="Restore Layout" icon={Icon.Play} onAction={() => requestRestore(layout.id)} />
                <Action title="Refresh Layouts" icon={Icon.ArrowClockwise} onAction={reload} />
                <Action.OpenInBrowser title="LayoutLock Raycast Help" url={layoutLockRaycastURL} />
              </ActionPanel>
            }
          />
        ))}
      {emptyState && (
        <List.EmptyView
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          actions={
            <ActionPanel>
              {emptyState.canOpenApp && <Action title="Open LayoutLock" icon={Icon.AppWindow} onAction={openApp} />}
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={reload} />
              {emptyState.needsInstall && (
                <Action.OpenInBrowser title="Install LayoutLock" url={layoutLockDownloadURL} />
              )}
              <Action.OpenInBrowser title="Setup and Troubleshooting" url={layoutLockRaycastURL} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

async function requestRestore(id: string) {
  try {
    const applications = await getApplications();
    const target = layoutLockTarget(environment.isDevelopment);
    if (!canDispatchToLayoutLock(applications, target, environment.isDevelopment)) {
      throw new LayoutLockNotInstalledError("Install LayoutLock before restoring a layout.");
    }
    await dispatchToLayoutLock(makeRestoreURL(id, target), target);
    await showHUD("Restore requested");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not request restore",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function openApp() {
  try {
    await openLayoutLock(layoutLockTarget(environment.isDevelopment));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open LayoutLock",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function emptyStateFor(state: LoadState) {
  if (state.status === "loading") {
    return undefined;
  }
  if (state.status === "ready") {
    return state.layouts.length === 0
      ? {
          icon: Icon.Desktop,
          title: "No Saved Layouts",
          description: "Open LayoutLock and save a layout, then refresh this list.",
          canOpenApp: true,
          needsInstall: false,
        }
      : undefined;
  }
  if (state.error instanceof LayoutLockNotInstalledError) {
    return {
      icon: Icon.Download,
      title: "Install LayoutLock",
      description: "This extension requires a current version of the LayoutLock macOS app.",
      canOpenApp: false,
      needsInstall: true,
    };
  }
  if (state.error instanceof UnsupportedLayoutIndexError) {
    return {
      icon: Icon.ExclamationMark,
      title: "Update LayoutLock",
      description: "This extension cannot read the layout index from your installed app version.",
      canOpenApp: true,
      needsInstall: false,
    };
  }
  if (state.error instanceof MissingLayoutIndexError) {
    return {
      icon: Icon.Document,
      title: "Open LayoutLock Once",
      description: "LayoutLock has not created its local Raycast index yet. Update or open the app, then refresh.",
      canOpenApp: true,
      needsInstall: false,
    };
  }
  return {
    icon: Icon.ExclamationMark,
    title: state.error instanceof CorruptLayoutIndexError ? "Layout Index Is Corrupt" : "Could Not Read Layouts",
    description: "Open LayoutLock to refresh its local index. If this continues, update the app.",
    canOpenApp: true,
    needsInstall: false,
  };
}
