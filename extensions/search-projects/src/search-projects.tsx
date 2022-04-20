import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";

import { useState, ReactElement } from "react";
import { OpenWith, Preferences, ProjectType } from "./types";
import { tildifyPath, useRepoCache } from "./utils";

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

export default function Main(): ReactElement {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>();
  const { response, error, isLoading } = useRepoCache(searchText);

  if (error) {
    showToast(Toast.Style.Failure, "", error);
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading}>
      <List.Section title={response?.sectionTitle}>
        {response?.repos?.map((repo) => (
          <List.Item
            key={repo.fullPath}
            id={repo.fullPath + repo.type}
            title={repo.name}
            icon={repo.icon}
            accessoryTitle={tildifyPath(repo.fullPath)}
            keywords={[repo.name]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Open
                    title={`Open in ${getOpenWith(repo.type, preferences).name}`}
                    icon={{ fileIcon: getOpenWith(repo.type, preferences).path }}
                    target={repo.fullPath}
                    application={getOpenWith(repo.type, preferences).bundleId}
                  />
                  {preferences.openWith1 && (
                    <Action.Open
                      title={`Open in ${preferences.openWith1.name}`}
                      icon={{ fileIcon: preferences.openWith1.path }}
                      target={repo.fullPath}
                      application={preferences.openWith1.bundleId}
                      shortcut={{ modifiers: ["opt"], key: "return" }}
                    />
                  )}
                  {preferences.openWith2 && (
                    <Action.Open
                      title={`Open in ${preferences.openWith2.name}`}
                      icon={{ fileIcon: preferences.openWith2.path }}
                      target={repo.fullPath}
                      application={preferences.openWith2.bundleId}
                      shortcut={{ modifiers: ["ctrl"], key: "return" }}
                    />
                  )}
                  {preferences.openWith3 && (
                    <Action.Open
                      title={`Open in ${preferences.openWith3.name}`}
                      icon={{ fileIcon: preferences.openWith3.path }}
                      target={repo.fullPath}
                      application={preferences.openWith3.bundleId}
                      shortcut={{ modifiers: ["shift"], key: "return" }}
                    />
                  )}
                  <Action.OpenWith path={repo.fullPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
