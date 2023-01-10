import { Action, ActionPanel, closeMainWindow, getApplications, Icon, open, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import { runAppleScript } from "run-applescript";
import {
  findTab,
  getSpaces,
  makeNewLittleArcWindow,
  makeNewTabWithinSpace,
  makeNewWindow,
  selectSpace,
  selectTab,
} from "./arc";
import { Space } from "./types";
import { getSpaceTitle } from "./utils";

export function OpenInArcAction(props: { url: string }) {
  async function handleAction() {
    try {
      const openTab = await findTab(props.url);

      if (openTab) {
        await closeMainWindow();
        await selectTab(openTab);
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

export function OpenInNewIncognitoWindowAction(props: { url: string }) {
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

export function OpenInLittleArc(props: { url: string }) {
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

export function OpenInSpaceAction(props: { url: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useCachedPromise(getSpaces, [], { execute: open });

  async function openSpace(space: Space) {
    try {
      await closeMainWindow();
      await makeNewTabWithinSpace(props.url, space);
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

export default function Actions(props: { url: string; title?: string }) {
  return (
    <ActionPanel>
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
    </ActionPanel>
  );
}
