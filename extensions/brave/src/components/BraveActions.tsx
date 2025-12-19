import { ReactElement } from "react";
import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon } from "@raycast/api";
import { closeTab, executeJavascript, openNewTab, setActiveTab } from "../actions";
import { SettingsProfileOpenBehaviour, Tab } from "../interfaces";
import { useCachedState } from "@raycast/utils";
import { BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID } from "../constants";

export class BraveActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
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
      <Action
        title="Move to New Window"
        icon={Icon.Window}
        onAction={async () => {
          await closeTab(tab.tabIndex);
          await openNewTab({ url: tab.url, profileCurrent, openTabInProfile, newWindow: true });
        }}
      />
      <Action
        title="Move to Incognito Window"
        icon={Icon.EyeDisabled}
        onAction={async () => {
          await closeTab(tab.tabIndex);
          await openNewTab({ url: tab.url, profileCurrent, openTabInProfile, incognito: true });
        }}
      />
      <Action.CopyToClipboard title="Copy URL" content={tab.url} />
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
        <Action onAction={() => executeJavascript(code)} icon={Icon.Play} title="Run Bookmarklet" />
        <Action.CopyToClipboard title="Copy Code" content={code} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      </ActionPanel>
    );
  }

  return (
    <ActionPanel title={title}>
      <Action
        onAction={async () => await openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile })}
        icon={Icon.Eye}
        title="Open"
      />
      <Action
        title="Open in New Window"
        icon={Icon.Window}
        onAction={async () =>
          await openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile, newWindow: true })
        }
      />
      <Action
        title="Open in Incognito Window"
        icon={Icon.EyeDisabled}
        onAction={async () =>
          await openNewTab({ url, profileOriginal, profileCurrent, openTabInProfile, incognito: true })
        }
      />
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
    await setActiveTab(props.tab);
    await closeMainWindow();
  }

  return <ActionPanel.Item title="Open Tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
