import { Action, ActionPanel, closeMainWindow, getApplications, Icon, open, showToast, Toast } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { useCallback, useState } from "react";
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
import { Space, Tab } from "./types";
import { getSpaceTitle, isTab, showFailureToast } from "./utils";

function OpenInArcAction(props: { tabOrUrl: Tab | string }) {
  async function handleAction() {
    try {
      if (typeof props.tabOrUrl === "string") {
        await open(props.tabOrUrl, "company.thebrowser.Browser");
      } else {
        await closeMainWindow();
        try {
          await selectTab(props.tabOrUrl);
        } catch (e) {
          if (props.tabOrUrl.url) {
            await open(props.tabOrUrl.url, "company.thebrowser.Browser");
          } else {
            throw e;
          }
        }
      }
    } catch (e) {
      console.error(e);
      await showFailureToast(e, { title: "Failed opening in Arc" });
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
      await showFailureToast(e, { title: "Failed opening link in new window" });
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
      await showFailureToast(e, { title: "Failed opening link in new incognito window" });
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
      await closeMainWindow();
      await makeNewLittleArcWindow(props.url);
    } catch (e) {
      await showFailureToast(e, { title: "Failed opening link in Little Arc window" });
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
      await showFailureToast(e, { title: "Failed opening link in space" });
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
      {data?.map((space) => <Action key={space.id} title={getSpaceTitle(space)} onAction={() => openSpace(space)} />)}
    </ActionPanel.Submenu>
  );
}

export function OpenSpaceAction(props: { space: Space }) {
  async function handleAction() {
    try {
      await closeMainWindow();
      await selectSpace(props.space);
    } catch (e) {
      await showFailureToast(e, { title: "Failed opening Space" });
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

export function SearchWithGoogleAction(props: { searchText: string }) {
  async function handleAction() {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(props.searchText)}`;

    try {
      const openTab = await findTab(searchUrl);
      if (openTab) {
        await closeMainWindow();
        await selectTab(openTab);
      } else {
        await open(searchUrl, "company.thebrowser.Browser");
      }
    } catch (e) {
      console.error(e);
      await open(searchUrl, "company.thebrowser.Browser");
    }
  }

  return props.searchText ? (
    <Action
      icon={Icon.MagnifyingGlass}
      title="Search with Google"
      shortcut={{ modifiers: ["ctrl"], key: "return" }}
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
      await showFailureToast(e, { title: "Failed reloading tab" });
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

          return data.filter((t) => !(t.id === props.tab.id));
        },
      });

      await showToast({ style: Toast.Style.Success, title: "Closed tab" });
    } catch (e) {
      await showFailureToast(e, { title: "Failed closing tab" });
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

// Sections

export function OpenLinkActionSections(props: { tabOrUrl: Tab | string; searchText: string }) {
  let url = props.tabOrUrl as string;

  if (isTab(props.tabOrUrl)) {
    url = props.tabOrUrl.url;
  } else {
    const hasProto = /^https?:\/\//i.test(url);
    url = hasProto ? url : "https://" + url;
  }

  return (
    <>
      <ActionPanel.Section>
        <OpenInArcAction tabOrUrl={isTab(props.tabOrUrl) ? props.tabOrUrl : url} />
        <OpenInLittleArc url={url} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <OpenInNewWindowAction url={url} />
        <OpenInNewIncognitoWindowAction url={url} />
        <OpenInSpaceAction url={url} />
        <OpenInOtherBrowserAction url={url} />
        <SearchWithGoogleAction searchText={props.searchText} />
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

export function EditTabActionSection(props: { tab: Tab; mutate: MutatePromise<Tab[] | undefined> }) {
  return (
    <ActionPanel.Section>
      <ReloadTabAction tab={props.tab} />
      <CloseTabAction tab={props.tab} mutate={props.mutate} />
    </ActionPanel.Section>
  );
}

export function CreateQuickLinkActionSection(props: { url: string; title?: string }) {
  return (
    <ActionPanel.Section>
      <Action.CreateQuicklink
        quicklink={{ link: props.url, name: props.title, application: "Arc" }}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
      />
    </ActionPanel.Section>
  );
}
