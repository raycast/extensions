import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { ReactElement } from "react";
import { CacheType, OpenWith, Preferences, ProjectType, SourceRepo } from "./types";
import { ApplicationCache } from "./cache/application-cache";

interface SearchProjectActionPanelProps {
  repo: SourceRepo;
  preferences: Preferences;
  pinned?: boolean;
  recent?: boolean;
}

export function SearchProjectActionPanel(props: SearchProjectActionPanelProps): ReactElement {
  const recentlyAccessedCache = new ApplicationCache(CacheType.RECENT_PROJECTS);
  const pinnedCache = new ApplicationCache(CacheType.PINNED_PROJECTS);

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

  function getOpenWith(projectType: ProjectType, preferences: Preferences): OpenWith {
    if (projectType === ProjectType.NODE) {
      return preferences.openNodeWith;
    } else if (projectType === ProjectType.MAVEN) {
      return preferences.openMavenWith;
    } else if (projectType === ProjectType.GRADLE) {
      return preferences.openGradleWith;
    }

    return preferences.openWith1;
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Open
          title={`Open in ${getOpenWith(props.repo.type, props.preferences).name}`}
          icon={{
            fileIcon: getOpenWith(props.repo.type, props.preferences).path,
          }}
          target={props.repo.fullPath}
          application={getOpenWith(props.repo.type, props.preferences).bundleId}
          onOpen={() => addToRecentlyAccessedCache(props.repo)}
        />

        {props.preferences.openWith1 && (
          <Action.Open
            title={`Open in ${props.preferences.openWith1.name}`}
            icon={{ fileIcon: props.preferences.openWith1.path }}
            target={props.repo.fullPath}
            application={props.preferences.openWith1.bundleId}
            shortcut={{ modifiers: ["opt"], key: "return" }}
            onOpen={() => addToRecentlyAccessedCache(props.repo)}
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

        {props.pinned && (
          <Action
            icon={Icon.Pin}
            title="Unpin Project"
            shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
            onAction={() => unpinRepo(props.repo)}
          />
        )}

        {!props.pinned && (
          <Action
            icon={Icon.Pin}
            title="Pin Project"
            shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
            onAction={() => pinRepo(props.repo)}
          />
        )}

        <Action.OpenWith path={props.repo.fullPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
