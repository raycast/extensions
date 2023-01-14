import { Action, ActionPanel, closeMainWindow, getApplications, Icon, open, showToast, Toast } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import { runAppleScript } from "run-applescript";
import {
  closeTab,
  findTab,
  getSpaces,
  makeNewLittleArcWindow,
  makeNewTabWithinSpace,
  makeNewWindow,
  reloadTab,
  selectSpace,
  selectTab,
} from "./arc";
import { BookmarkTab, Space, Tab, UpdateBookmarks } from "./types";
import { getSpaceTitle } from "./utils";

function OpenInArcAction(props: { url: string }) {
  async function handleAction() {
    try {
      const openTab = await findTab(props.url);

      if (openTab) {
        await closeMainWindow();
        await selectTab(openTab);
      } else {
        await open(props.url, "company.thebrowser.Browser");
      }
    } catch (e) {
      console.error(e);

      await open(props.url, "company.thebrowser.Browser");
    }
  }

  return <Action icon={Icon.Globe} title="Open in Arc" onAction={handleAction} />;
}

function OpenInNewWindowAction(props: { url: string }) {
  async function handleAction() {
    try {
      await closeMainWindow();
      await makeNewWindow({ url: props.url });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed opening link in new window",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Action
      icon={Icon.Globe}
      title="Open in New Window"
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      onAction={handleAction}
    />
  );
}

function OpenInNewIncognitoWindowAction(props: { url: string }) {
  async function handleAction() {
    try {
      await closeMainWindow();
      await makeNewWindow({ incognito: true, url: props.url });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed opening link in new incognito window",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Action
      icon={Icon.Globe}
      title="Open in Incognito Window"
      shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "enter" }}
      onAction={handleAction}
    />
  );
}

function OpenInLittleArc(props: { url: string }) {
  async function handleAction() {
    try {
      makeNewLittleArcWindow(props.url);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed opening link in Little Arc window",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return <Action icon={Icon.Globe} title="Open in Little Arc Window" onAction={handleAction} />;
}

function OpenInSpaceAction(props: { url: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useCachedPromise(getSpaces, [], { execute: open });

  async function openSpace(space: Space) {
    try {
      await closeMainWindow();
      await makeNewTabWithinSpace(props.url, space);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed opening link in space",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <ActionPanel.Submenu
      icon={Icon.Sidebar}
      title="Open in Space"
      isLoading={isLoading}
      shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
      onOpen={() => setOpen(true)}
    >
      {data?.map((space) => (
        <Action key={space.id} title={getSpaceTitle(space)} onAction={() => openSpace(space)} />
      ))}
    </ActionPanel.Submenu>
  );
}

export function OpenSpaceAction(props: { space: Space }) {
  async function handleAction() {
    try {
      await closeMainWindow();
      await selectSpace(props.space);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed opening Space",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return <Action icon={Icon.Sidebar} title="Open Space" onAction={handleAction} />;
}

const browserBundleIds = new Set([
  "com.apple.safari",
  "com.apple.safaritechnologypreview",
  "com.google.chrome",
  "com.google.chrome.canary",
  "org.mozilla.firefox",
  "org.mozilla.firefoxdeveloperedition",
  "com.brave.browser",
  "com.operasoftware.opera",
  "com.microsoft.edgemac",
  "com.microsoft.edgemac.beta",
  "com.vivaldi.vivaldi",
  "com.kagi.kagimacos", // Orion
]);

function OpenInOtherBrowserAction(props: { url: string }) {
  const [open, setOpen] = useState<boolean>();
  const { data } = useBrowsers({ execute: open });

  return (
    <ActionPanel.Submenu
      icon={Icon.Globe}
      title="Open in Other Browser"
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onOpen={() => setOpen(true)}
    >
      {data?.map((browser) => (
        <Action.Open
          key={browser.path}
          icon={{ fileIcon: browser.path }}
          title={browser.name}
          target={props.url}
          application={browser}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function useBrowsers(options?: { execute?: boolean }) {
  const fetchBrowsers = useCallback(async () => {
    const applications = await getApplications();
    return applications
      .filter((a) => a.bundleId && browserBundleIds.has(a.bundleId.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);
  return useCachedPromise(fetchBrowsers, [], { execute: options?.execute });
}

// Unfortunately the AppleScript crashes Arc 😥
// Waiting for a fix to add this to the empty view
export function SearchWithGoogleAction(props: { searchText?: string }) {
  async function handleAction() {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(props.searchText ?? "")}`;
    await runAppleScript(`
      tell application "Arc"
        activate
        tell front window to make new tab at after (get active tab) with properties {URL:"${searchUrl}"}
      end tell
    `);
  }

  return props.searchText ? (
    <Action
      icon={Icon.MagnifyingGlass}
      title="Search with Google"
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      onAction={handleAction}
    />
  ) : null;
}

function ReloadTabAction(props: { tab: Tab }) {
  async function handleAction() {
    await showToast({ style: Toast.Style.Animated, title: "Reloading tab" });

    try {
      await reloadTab(props.tab);
      await showToast({ style: Toast.Style.Success, title: "Reloaded tab" });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed reloading tab",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Action
      icon={Icon.ArrowClockwise}
      title="Reload Tab"
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={handleAction}
    />
  );
}

function CloseTabAction(props: { tab: Tab; mutate: MutatePromise<Tab[] | undefined> }) {
  async function handleAction() {
    await showToast({ style: Toast.Style.Animated, title: "Closing tab" });

    try {
      await props.mutate(closeTab(props.tab), {
        optimisticUpdate(data) {
          if (!data) {
            return;
          }

          return data.filter((t) => !(t.windowId === props.tab.windowId && t.tabId === props.tab.tabId));
        },
      });

      await showToast({ style: Toast.Style.Success, title: "Closed tab" });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed closing tab",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Action
      icon={Icon.XMarkCircle}
      title="Close Tab"
      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      onAction={handleAction}
    />
  );
}

export function BookmarkTabAction(props: { tab: Tab; savedBookmarks: BookmarkTab; updateBookmarks: UpdateBookmarks }) {
  const isTabBookmarked = props.savedBookmarks[props.tab.url];

  async function handleAction() {
    try {
      await props.updateBookmarks(props.savedBookmarks, props.tab);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed updating bookmarks",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Action
      icon={Icon.Bookmark}
      title={isTabBookmarked ? "Remove Bookmark" : "Bookmark Tab"}
      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
      onAction={handleAction}
    />
  );
}

// Sections

export function OpenLinkActionSections(props: { url: string }) {
  return (
    <>
      <ActionPanel.Section>
        <OpenInArcAction url={props.url} />
        <OpenInLittleArc url={props.url} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <OpenInNewWindowAction url={props.url} />
        <OpenInNewIncognitoWindowAction url={props.url} />
        <OpenInSpaceAction url={props.url} />
        <OpenInOtherBrowserAction url={props.url} />
      </ActionPanel.Section>
    </>
  );
}

export function CopyLinkActionSection(props: { url: string; title?: string }) {
  return (
    <ActionPanel.Section>
      <Action.CopyToClipboard
        title="Copy URL"
        content={props.url}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      {props.title && (
        <Action.CopyToClipboard
          title="Copy Title"
          content={props.title}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      )}
      {props.title && (
        <Action.CopyToClipboard
          title="Copy URL as Markdown"
          content={`[${props.title}](${props.url})`}
          shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "c" }}
        />
      )}
    </ActionPanel.Section>
  );
}

export function EditTabActionSection(props: {
  tab: Tab;
  mutate: MutatePromise<Tab[] | undefined>;
  savedBookmarks: BookmarkTab;
  updateBookmarks: UpdateBookmarks;
}) {
  return (
    <ActionPanel.Section>
      <BookmarkTabAction
        tab={props.tab}
        savedBookmarks={props.savedBookmarks}
        updateBookmarks={props.updateBookmarks}
      />
      <ReloadTabAction tab={props.tab} />
      <CloseTabAction tab={props.tab} mutate={props.mutate} />
    </ActionPanel.Section>
  );
}
