import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";

import { useState, ReactElement } from "react";
import { Preferences, tildifyPath, useRepoCache } from "./utils";

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
            id={repo.fullPath}
            title={repo.name}
            icon={repo.icon}
            accessoryTitle={tildifyPath(repo.fullPath)}
            keywords={[repo.name]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Open
                    title={`Open in ${preferences.openWith1.name}`}
                    icon={{ fileIcon: preferences.openWith1.path }}
                    target={repo.fullPath}
                    application={preferences.openWith1.bundleId}
                  />
                  <Action.Open
                    title={`Open in ${preferences.openWith2.name}`}
                    icon={{ fileIcon: preferences.openWith2.path }}
                    target={repo.fullPath}
                    application={preferences.openWith2.bundleId}
                  />
                  {preferences.openWith3 && (
                    <Action.Open
                      title={`Open in ${preferences.openWith3.name}`}
                      icon={{ fileIcon: preferences.openWith3.path }}
                      target={repo.fullPath}
                      application={preferences.openWith3.bundleId}
                      shortcut={{ modifiers: ["opt"], key: "return" }}
                    />
                  )}
                  {preferences.openWith4 && (
                    <Action.Open
                      title={`Open in ${preferences.openWith4.name}`}
                      icon={{ fileIcon: preferences.openWith4.path }}
                      target={repo.fullPath}
                      application={preferences.openWith4.bundleId}
                      shortcut={{ modifiers: ["ctrl"], key: "return" }}
                    />
                  )}
                  {preferences.openWith5 && (
                    <Action.Open
                      title={`Open in ${preferences.openWith5.name}`}
                      icon={{ fileIcon: preferences.openWith5.path }}
                      target={repo.fullPath}
                      application={preferences.openWith5.bundleId}
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
