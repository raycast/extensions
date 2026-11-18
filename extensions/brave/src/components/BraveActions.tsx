import { showError } from "@chrismessina/raycast-kit";
import { isWindows } from "../util/platform";
import { ReactElement } from "react";
import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon, Keyboard } from "@raycast/api";
import {
  closeTabs,
  deduplicateTabs,
  executeJavascript,
  openNewTab,
  setActiveTab,
  openAllBookmarksInFolder,
} from "../actions";
import { SettingsProfileOpenBehaviour, Tab } from "../interfaces";
import { useCachedState } from "@raycast/utils";
import { BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID } from "../constants";
import { SHORTCUTS } from "../shortcuts";
import { launchBrowserCommand } from "../util/launch-browser-command";

export class BraveActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
  public static OpenAllBookmarksInFolder = OpenAllBookmarksInFolderAction;
}

function OpenAllBookmarksInFolderAction(props: { urls: string[]; profile: string }) {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);

  return (
    <ActionPanel title="Open All Bookmarks In Folder">
      <Action
        title="Open All Bookmarks in Folder"
        onAction={() =>
          openAllBookmarksInFolder({
            urls: props.urls,
            profileCurrent: profileCurrent,
            openTabInProfile: openTabInProfile,
          })
        }
      />
    </ActionPanel>
  );
}

function NewTabActions({ query, incognito }: { query?: string; incognito?: boolean }): ReactElement {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);

  return (
    <ActionPanel title="New Tab">
      <Action
        onAction={() => openNewTab({ query, profileCurrent, openTabInProfile, incognito })}
        title={query ? `Search "${query}"` : "Open New Tab"}
        icon={Icon.Globe}
      />
    </ActionPanel>
  );
}

function TabListItemActions({ tab, revalidate }: { tab: Tab; revalidate: () => Promise<void> }) {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);

  async function updateTabs(action: () => Promise<void>, errorTitle: string) {
    try {
      await action();
    } catch (error) {
      await showError(error, { title: errorTitle });
    } finally {
      try {
        await revalidate();
      } catch (error) {
        await showError(error, { title: "Could Not Reload Tabs" });
      }
    }
  }

  return (
    <ActionPanel title={tab.title}>
      <ActionPanel.Section>
        <GoToTab tab={tab} />
        <Action
          title="Open New Tab"
          icon={Icon.PlusCircle}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => launchBrowserCommand()}
        />
        {!isWindows && (
          <>
            <Action
              title="Move to New Window"
              icon={Icon.Window}
              onAction={() =>
                updateTabs(async () => {
                  await closeTabs([tab]);
                  await openNewTab({ url: tab.url, profileCurrent, openTabInProfile, newWindow: true });
                }, "Could Not Move Tab")
              }
            />
            <Action
              title="Move to Private Window"
              icon={Icon.EyeDisabled}
              onAction={() =>
                updateTabs(async () => {
                  await closeTabs([tab]);
                  await openNewTab({ url: tab.url, profileCurrent, openTabInProfile, incognito: true });
                }, "Could Not Move Tab")
              }
            />
          </>
        )}
        {!isWindows && (
          <Action
            title="Close Tab"
            icon={Icon.XMarkCircle}
            shortcut={SHORTCUTS.closeTab}
            onAction={() => updateTabs(() => closeTabs([tab]), "Could Not Close Tab")}
          />
        )}
        <OpenInNewTabAction onAction={() => openNewTab({ url: tab.url, profileCurrent, openTabInProfile })} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy URL" content={tab.url} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard title="Copy Title" content={tab.title} shortcut={Keyboard.Shortcut.Common.CopyName} />
        <CreateQuicklinkAction url={tab.url} title={tab.title} />
        {!isWindows && (
          <Action
            title="Deduplicate Tabs"
            icon={Icon.Filter}
            shortcut={SHORTCUTS.deduplicateTabs}
            onAction={() => updateTabs(deduplicateTabs, "Could Not Deduplicate Tabs")}
          />
        )}
        <Action
          title="Reload Tabs"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={async () => {
            try {
              await revalidate();
            } catch (error) {
              await showError(error, { title: "Could Not Reload Tabs" });
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function OpenInNewTabAction({ onAction }: { onAction: () => Promise<unknown> }) {
  return (
    <Action
      title="Open in New Tab"
      icon={Icon.PlusSquare}
      shortcut={Keyboard.Shortcut.Common.Open}
      onAction={onAction}
    />
  );
}

function CreateQuicklinkAction({ url, title }: { url: string; title: string }) {
  return (
    <Action.CreateQuicklink
      icon={Icon.Quicklink}
      shortcut={SHORTCUTS.createQuicklink}
      quicklink={{ link: url, name: title || "Untitled" }}
    />
  );
}

function HistoryItemActions({
  title,
  url,
  profile: profileOriginal,
  isBookmark,
}: {
  title: string;
  url: string;
  profile: string;
  isBookmark: boolean;
}): ReactElement {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);

  if (url.startsWith("javascript:")) {
    const code = url.substring("javascript:".length);
    return (
      <ActionPanel title={title}>
        {!isWindows && <Action onAction={() => executeJavascript(code)} icon={Icon.Play} title="Run Bookmarklet" />}
        <Action.CopyToClipboard title="Copy Code" content={code} shortcut={Keyboard.Shortcut.Common.Copy} />
      </ActionPanel>
    );
  }

  return (
    <ActionPanel title={title}>
      {isBookmark ? (
        <OpenInNewTabAction onAction={() => openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile })} />
      ) : (
        <Action
          onAction={() => openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile })}
          icon={Icon.Globe}
          title="Open"
        />
      )}
      <Action
        title="Open in New Window"
        icon={Icon.Window}
        onAction={async () =>
          await openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile, newWindow: true })
        }
        shortcut={Keyboard.Shortcut.Common.New}
      />
      <Action
        title="Open in Private Window"
        icon={Icon.EyeDisabled}
        onAction={async () =>
          await openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile, incognito: true })
        }
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "n" },
          Windows: { modifiers: ["ctrl", "shift"], key: "n" },
        }}
      />
      <ActionPanel.Section title={"Open in profile"}>
        <Action
          icon={Icon.PersonCircle}
          title={"Open in Current Profile"}
          onAction={() =>
            openNewTab({
              url,
              profileOriginal,
              profileCurrent,
              openTabInProfile: SettingsProfileOpenBehaviour.ProfileCurrent,
            })
          }
        />
        <Action
          icon={Icon.Person}
          title={"Open in Original Profile"}
          onAction={() =>
            openNewTab({
              url,
              profileOriginal,
              profileCurrent,
              openTabInProfile: SettingsProfileOpenBehaviour.ProfileOriginal,
            })
          }
        />
      </ActionPanel.Section>
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
      {isBookmark && <CreateQuicklinkAction url={url} title={title} />}
    </ActionPanel>
  );
}

function GoToTab(props: { tab: Tab }) {
  async function handleAction() {
    try {
      await setActiveTab(props.tab);
      await closeMainWindow();
    } catch (error) {
      await showError(error, { title: "Could Not Switch to Tab" });
    }
  }

  return <Action title="Switch to Tab" icon={Icon.ArrowRight} onAction={handleAction} />;
}
