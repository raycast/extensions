import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import type { ReactElement } from "react";
import { CacheType, ListType, Preferences, SourceRepo } from "./types";
import { ApplicationCache } from "./cache/application-cache";
import { getOpenWith } from "./common-utils";

interface SearchProjectActionPanelProps {
  repo: SourceRepo;
  preferences: Preferences;
  listType: ListType;
}

export function SearchProjectActionPanel(props: Readonly<SearchProjectActionPanelProps>): ReactElement {
  const recentlyAccessedCache = new ApplicationCache(CacheType.RECENT_PROJECTS);
  const pinnedCache = new ApplicationCache(CacheType.PINNED_PROJECTS);
  const openWith = getOpenWith(props.repo.openWithKey, props.preferences);

  function addToRecentlyAccessedCache(repo: SourceRepo): void {
    recentlyAccessedCache.addToCache(repo);
    recentlyAccessedCache.save();
  }

  function pinRepo(repo: SourceRepo): void {
    pinnedCache.addToCache(repo);
    pinnedCache.save();
    showToast(Toast.Style.Success, "", "Repo pinned.");
  }

  function unpinRepo(repo: SourceRepo): void {
    pinnedCache.removeFromCache(repo);
    pinnedCache.save();
    showToast(Toast.Style.Success, "", "Repo un-pinned.");
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Open
          title={`Open in ${openWith.name}`}
          icon={{
            fileIcon: openWith.path,
          }}
          target={props.repo.fullPath}
          application={openWith.bundleId}
          onOpen={() => addToRecentlyAccessedCache(props.repo)}
        />

        <Action.Open
          title={`Open in ${props.preferences.openDefaultWith.name}`}
          icon={{ fileIcon: props.preferences.openDefaultWith.path }}
          target={props.repo.fullPath}
          application={props.preferences.openDefaultWith.bundleId}
          shortcut={{ modifiers: ["opt"], key: "return" }}
          onOpen={() => addToRecentlyAccessedCache(props.repo)}
        />

        {openWith.bundleId && openWith.bundleId !== "-" && (
          <Action.CreateQuicklink
            title="Create Project Quicklink"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            quicklink={{
              name: props.repo.name,
              link: props.repo.fullPath,
              application: openWith.bundleId,
            }}
          />
        )}

        {props.preferences.openWith2 && (
          <Action.Open
            title={`Open in ${props.preferences.openWith2.name}`}
            icon={{ fileIcon: props.preferences.openWith2.path }}
            target={props.repo.fullPath}
            application={props.preferences.openWith2.bundleId}
            shortcut={{ modifiers: ["ctrl"], key: "return" }}
            onOpen={() => addToRecentlyAccessedCache(props.repo)}
          />
        )}

        {props.preferences.openWith3 &&
          props.preferences.openWith2?.bundleId != props.preferences.openWith3?.bundleId && (
            <Action.Open
              title={`Open in ${props.preferences.openWith3.name}`}
              icon={{ fileIcon: props.preferences.openWith3.path }}
              target={props.repo.fullPath}
              application={props.preferences.openWith3.bundleId}
              shortcut={{ modifiers: ["shift"], key: "return" }}
              onOpen={() => addToRecentlyAccessedCache(props.repo)}
            />
          )}

        {props.listType == "pinned" && (
          <Action
            icon={Icon.Pin}
            title="Unpin Project"
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={() => unpinRepo(props.repo)}
          />
        )}

        {props.listType !== "pinned" && (
          <Action
            icon={Icon.Pin}
            title="Pin Project"
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={() => pinRepo(props.repo)}
          />
        )}
        <Action.ShowInFinder
          icon={Icon.Finder}
          title="Reveal in Finder"
          path={props.repo.fullPath}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
        <Action.Open
          title={`Open in Terminal`}
          target={props.repo.fullPath}
          icon={Icon.Terminal}
          application={"com.apple.Terminal"}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          onOpen={() => addToRecentlyAccessedCache(props.repo)}
        />
        <Action.OpenWith path={props.repo.fullPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
