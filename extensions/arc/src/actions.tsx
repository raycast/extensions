import {
  Action,
  ActionPanel,
  closeMainWindow,
  getApplications,
  Icon,
  open,
  showToast,
  Toast,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { execSync } from "child_process";
import { useCallback, useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { promisify } from "util";
import { Tab } from "./types";
import { getOpenTabs, setActiveTab, createNewArcWindow } from "./utils";

const execAsync = promisify(execSync);

export function OpenInArcAction(props: { url: string }) {
  const [openTabs, setOpenTabs] = useState<Tab[]>();

  console.log("Open tabs", openTabs);

  async function handleAction() {
    const openTab = openTabs?.find((tab) => tab.url === props.url);

    console.log("Open Tab", openTab);

    if (openTab) {
      await setActiveTab(openTab);
    } else {
      await open(props.url, "Arc");
    }
  }

  useEffect(() => {
    getOpenTabs().then(setOpenTabs);
  }, []);

  return <Action icon={Icon.Globe} title="Open in Arc" onAction={handleAction} />;
}
export function OpenInNewWindow(props: { url: string }) {
  async function handleAction() {
    try {
      await closeMainWindow();
      await createNewArcWindow();
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
      onAction={handleAction}
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
    />
  );
}

export function OpenInLittleArc(props: { url: string }) {
  async function handleAction() {
    try {
      await closeMainWindow();
      await execAsync(`open -na "Arc" --args --new-window "${props.url}"`);
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
