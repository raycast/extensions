import { ReactElement } from "react";
import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon } from "@raycast/api";
import { closeActiveTab, openNewTab, setActiveTab } from "../actions";
import { Preferences, SettingsProfileOpenBehaviour, Tab } from "../interfaces";
import { useCachedState } from "@raycast/utils";
import { CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID } from "../constants";

export class ChromeActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
}

function NewTabActions({ query }: { query?: string }): ReactElement {
  const { openTabInProfile } = getPreferenceValues<Preferences>();
  const [profileCurrent] = useCachedState(CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID);

  return (
    <ActionPanel title="New Tab">
      <ActionPanel.Item
        onAction={() => openNewTab({ query, profileCurrent, openTabInProfile })}
        title={query ? `Search "${query}"` : "Open Empty Tab"}
      />
    </ActionPanel>
  );
}

function TabListItemActions({ tab, onTabClosed }: { tab: Tab; onTabClosed?: () => void }) {
  return (
    <ActionPanel title={tab.title}>
      <GoToTab tab={tab} />
      <Action.CopyToClipboard title="Copy URL" content={tab.url} />
      <CloseTab tab={tab} onTabClosed={onTabClosed} />
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
      <ActionPanel.Item
        onAction={() => openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile })}
        title={"Open"}
      />
      <ActionPanel.Section title={"Open in profile"}>
        <ActionPanel.Item
          onAction={() =>
            openNewTab({
              url,
              profileOriginal,
              profileCurrent,
              openTabInProfile: SettingsProfileOpenBehaviour.ProfileCurrent,
            })
          }
          title={"Open in current profile"}
        />
        <ActionPanel.Item
          onAction={() =>
            openNewTab({
              url,
              profileOriginal,
              profileCurrent,
              openTabInProfile: SettingsProfileOpenBehaviour.ProfileOriginal,
            })
          }
          title={"Open in original profile"}
        />
      </ActionPanel.Section>
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
    </ActionPanel>
  );
}

function GoToTab(props: { tab: Tab }) {
  async function handleAction() {
    await setActiveTab(props.tab);
    await closeMainWindow();
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
    <ActionPanel.Item
      title="Close Tab"
      icon={{ source: Icon.XMarkCircle }}
      onAction={handleAction}
      shortcut={{ modifiers: ["cmd"], key: "w" }}
    />
  );
}
