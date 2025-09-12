import { ReactElement } from "react";
import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon } from "@raycast/api";
import { closeActiveTab, openNewTab, reloadTab, setActiveTab } from "../actions";
import { Preferences, SettingsProfileOpenBehaviour, Tab } from "../interfaces";
import { useCachedState } from "@raycast/utils";
import { CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID } from "../constants";

export class ChromeActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
}

function NewTabActions({ query, url }: { query?: string; url?: string }): ReactElement {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID);

  let actionTitle = "Open Empty Tab";
  if (query) {
    actionTitle = `Search "${query}"`;
  } else if (url) {
    actionTitle = `Open URL "${url}"`;
  }

  return (
    <ActionPanel title="New Tab">
      <Action onAction={() => openNewTab({ url, query, profileCurrent, openTabInProfile })} title={actionTitle} />
    </ActionPanel>
  );
}

function TabListItemActions({ tab, onTabClosed }: { tab: Tab; onTabClosed?: () => void }) {
  return (
    <ActionPanel title={tab.title}>
      <GoToTab tab={tab} />
      <ReloadTab tab={tab} />
      <Action.CopyToClipboard title="Copy URL" content={tab.url} />
      <Action.CopyToClipboard
        title="Copy Title"
        content={tab.title}
        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      />
      <CloseTab tab={tab} onTabClosed={onTabClosed} />
      <ActionPanel.Section>
        <Action.CreateQuicklink
          quicklink={{ link: tab.url, name: tab.title, application: "Google Chrome" }}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
      </ActionPanel.Section>
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
  const [profileCurrent] = useCachedState(CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID);

  return (
    <ActionPanel title={title}>
      <Action onAction={() => openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile })} title={"Open"} />
      <ActionPanel.Section title={"Open in profile"}>
        <Action
          onAction={() =>
            openNewTab({
              url,
              profileOriginal,
              profileCurrent,
              openTabInProfile: SettingsProfileOpenBehaviour.ProfileCurrent,
            })
          }
          title={"Open in Current Profile"}
        />
        <Action
          onAction={() =>
            openNewTab({
              url,
              profileOriginal,
              profileCurrent,
              openTabInProfile: SettingsProfileOpenBehaviour.ProfileOriginal,
            })
          }
          title={"Open in Original Profile"}
        />
      </ActionPanel.Section>
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
    </ActionPanel>
  );
}

function GoToTab(props: { tab: Tab }) {
  async function handleAction() {
    try {
      await setActiveTab(props.tab);
      await closeMainWindow();
    } catch (e) {
      if (e instanceof Error) {
        throw new Error("Issue with tab: '" + props.tab.sourceLine + "'\n" + e.message);
      } else {
        throw e;
      }
    }
  }

  return <ActionPanel.Item title="Open Tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}

function CloseTab(props: { tab: Tab; onTabClosed?: () => void }) {
  async function handleAction() {
    await closeActiveTab(props.tab);
    await closeMainWindow();
    props.onTabClosed?.();
  }

  return (
    <Action
      title="Close Tab"
      icon={{ source: Icon.XMarkCircle }}
      onAction={handleAction}
      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
    />
  );
}

function ReloadTab(props: { tab: Tab }) {
  async function handleAction() {
    try {
      await reloadTab(props.tab);
      await closeMainWindow();
    } catch (e) {
      if (e instanceof Error) {
        throw new Error("Issue with tab: '" + props.tab.sourceLine + "'\n" + e.message);
      } else {
        throw e;
      }
    }
  }

  return (
    <Action
      title="Reload Tab"
      icon={{ source: Icon.ArrowClockwise }}
      onAction={handleAction}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
    />
  );
}
