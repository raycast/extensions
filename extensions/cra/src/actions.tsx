import {
  Action,
  ActionPanel,
  closeMainWindow,
  getApplications,
  Icon,
  open,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { MutatePromise, showFailureToast, useCachedPromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import {
  closeTab,
  findTab,
  getSpaces,
  makeNewLittleWindow,
  makeNewTabWithinSpace,
  makeNewWindow,
  reloadTab,
  selectSpace,
  selectTab,
} from "./cra";
import { Space, Tab } from "./types";
import { getSpaceTitle, normalizeURL } from "./utils";

function OpenInArcAction(props: { tabOrUrl: Tab | string }) {
  async function handleAction() {
    try {
      if (typeof props.tabOrUrl === "string") {
        await open(props.tabOrUrl, "dk.kildahl.cra");
      } else {
        try {
          await selectTab(props.tabOrUrl);
          closeMainWindow();
        } catch (e) {
          if (props.tabOrUrl.url) {
            await open(props.tabOrUrl.url, "dk.kildahl.cra");
          } else {
            throw e;
          }
        }
      }
    } catch (e) {
      console.error(e);
      await showFailureToast(e, { title: "Failed opening in Cra" });
    }
  }

  return <Action icon={Icon.Globe} title="Open in Cra" onAction={handleAction} />;
}

function OpenInNewWindowAction(props: { url: string }) {
  async function handleAction() {
    try {
      await makeNewWindow({ url: props.url });
      closeMainWindow();
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
      await makeNewWindow({ incognito: true, url: props.url });
      closeMainWindow();
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

function OpenInLittleWindowAction(props: { url: string }) {
  async function handleAction() {
    try {
      await makeNewLittleWindow(props.url);
      closeMainWindow();
    } catch (e) {
      await showFailureToast(e, { title: "Failed opening link in Little Window" });
    }
  }

  return <Action icon={Icon.Globe} title="Open in Little Window" onAction={handleAction} />;
}

function OpenInSpaceAction(props: { url: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useCachedPromise(getSpaces, [], { execute: open });

  async function openSpace(space: Space) {
    try {
      await makeNewTabWithinSpace(props.url, space);
      closeMainWindow();
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
      await selectSpace(props.space);
      closeMainWindow();
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
  "app.zen-browser.zen",
  "company.thebrowser.dia",
  "ai.perplexity.comet",
]);

function OpenInOtherBrowserAction(props: { url: string }) {
  const [open, setOpen] = useState<boolean>();
  const { data } = useBrowsers({ execute: open });

  return (
    <ActionPanel.Submenu
      icon={Icon.Globe}
      title="Open in Other Browser"
      shortcut={Keyboard.Shortcut.Common.Open}
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
        await selectTab(openTab);
        closeMainWindow();
      } else {
        await open(searchUrl, "dk.kildahl.cra");
      }
    } catch (e) {
      console.error(e);
      await open(searchUrl, "dk.kildahl.cra");
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
  const { tabOrUrl } = props;
  let url: string | undefined;

  if (typeof tabOrUrl !== "string") {
    // A real tab can have an empty URL (new tab, loading page), so don't gate on the URL here.
    url = tabOrUrl.url || undefined;
  } else {
    try {
      url = normalizeURL(tabOrUrl);
    } catch {
      url = undefined;
    }
  }

  if (!url) {
    return typeof tabOrUrl === "string" ? null : (
      <ActionPanel.Section>
        <OpenInArcAction tabOrUrl={tabOrUrl} />
      </ActionPanel.Section>
    );
  }

  return (
    <>
      <ActionPanel.Section>
        <OpenInArcAction tabOrUrl={typeof tabOrUrl !== "string" ? tabOrUrl : url} />
        <OpenInLittleWindowAction url={url} />
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
      <Action.CopyToClipboard title="Copy URL" content={props.url} shortcut={Keyboard.Shortcut.Common.Copy} />
      {props.title && (
        <Action.CopyToClipboard title="Copy Title" content={props.title} shortcut={Keyboard.Shortcut.Common.CopyName} />
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
        quicklink={{ link: props.url, name: props.title, application: "Cra" }}
        shortcut={Keyboard.Shortcut.Common.Save}
      />
    </ActionPanel.Section>
  );
}
