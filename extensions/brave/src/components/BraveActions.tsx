import { showError } from "@chrismessina/raycast-kit";
import { isWindows } from "../util/platform";
import { ReactElement } from "react";
import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon, Keyboard } from "@raycast/api";
import { closeTab, executeJavascript, openNewTab, setActiveTab, openAllBookmarksInFolder } from "../actions";
import { SettingsProfileOpenBehaviour, Tab } from "../interfaces";
import { useCachedState } from "@raycast/utils";
import { BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID } from "../constants";

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

function TabListItemActions({ tab }: { tab: Tab }) {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);

  return (
    <ActionPanel title={tab.title}>
      <GoToTab tab={tab} />
      {!isWindows && (
        <>
          <Action
            title="Move to New Window"
            icon={Icon.Window}
            onAction={async () => {
              await closeTab(tab.tabIndex);
              await openNewTab({ url: tab.url, profileCurrent, openTabInProfile, newWindow: true });
            }}
          />
          <Action
            title="Move to Private Window"
            icon={Icon.EyeDisabled}
            onAction={async () => {
              await closeTab(tab.tabIndex);
              await openNewTab({ url: tab.url, profileCurrent, openTabInProfile, incognito: true });
            }}
          />
        </>
      )}
      <Action.CopyToClipboard title="Copy URL" content={tab.url} shortcut={Keyboard.Shortcut.Common.Copy} />
    </ActionPanel>
  );
}

function HistoryItemActions({
  title,
  url,
  profile: profileOriginal,
}: {
  title: string;
  url: string;
  profile: string;
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
      <Action
        onAction={async () => await openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile })}
        icon={Icon.Globe}
        title="Open"
      />
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

  return <Action title="Switch to Tab" icon={{ source: Icon.Switch }} onAction={handleAction} />;
}
