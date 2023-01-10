import { Action, ActionPanel, closeMainWindow, getApplications, Icon, open, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { execSync } from "child_process";
import { useCallback, useState } from "react";
import { runAppleScript } from "run-applescript";
import { promisify } from "util";
import { openNewWindow } from "./utils";
import { findOpenTab, setActiveTab } from "./tabs";
import { createTabWithinSpace, focusSpace, useSpaces } from "./spaces";

const execAsync = promisify(execSync);

export function OpenInArcAction(props: { url: string }) {
  async function handleAction() {
    try {
      const openTab = await findOpenTab(props.url);
      console.log(openTab);

      if (openTab) {
        await closeMainWindow();
        await setActiveTab(openTab);
      } else {
        await open(props.url, "Arc");
      }
    } catch (e) {
      console.error(e);

      await open(props.url, "Arc");
    }
  }

  return <Action icon={Icon.Globe} title="Open in Arc" onAction={handleAction} />;
}

export function OpenInNewWindowAction(props: { url: string }) {
  async function handleAction() {
    try {
      await closeMainWindow();
      await openNewWindow();
      await execAsync(`open -a Arc "${props.url}"`);
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

export function OpenInLittleArc(props: { url: string }) {
  async function handleAction() {
    try {
      await runAppleScript(`
        tell application "Arc"
          make new tab with properties {URL:"${props.url}"}
        end tell
      `);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed opening link in Little Arc",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return <Action icon={Icon.Globe} title="Open in Little Arc" onAction={handleAction} />;
}

export function OpenInSpaceAction(props: { url: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSpaces({ execute: open });

  async function openSpace(spaceId: string) {
    try {
      await closeMainWindow();
      await createTabWithinSpace(props.url, spaceId);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed opening link in Space",
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
        <Action key={space.id} title={space.title || `Space ${space.id}`} onAction={() => openSpace(space.id)} />
      ))}
    </ActionPanel.Submenu>
  );
}

export function OpenSpaceAction(props: { spaceId: string }) {
  async function handleAction() {
    try {
      await closeMainWindow();
      await focusSpace(props.spaceId);
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

export function OpenInOtherBrowserAction(props: { url: string }) {
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
