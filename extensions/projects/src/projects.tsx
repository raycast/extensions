import { getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, ReactElement } from "react";
import { SearchProjectActionPanel } from "./action-panel";
import { Preferences } from "./types";
import { tildifyPath, useRepoCache } from "./projects-service";

export default function Main(): ReactElement {
  const searchBarPlaceholders = [
    "Search for a project",
    "Search projects by name",
    "Search projects by type. e.g. 'type: node'",
    "Search projects in directory. e.g. 'dir: ajay'",
    "Combine keywords to search. e.g. 'dir: ajay type: node'",
  ];

  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>();
  const { response, error, isLoading } = useRepoCache(searchText);

  if (error) {
    showToast(Toast.Style.Failure, "", error);
  }

  return (
    <List
      searchBarPlaceholder={searchBarPlaceholders[Math.floor(Math.random() * searchBarPlaceholders.length)]}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
    >
      <List.Section title={response?.pinned?.sectionTitle}>
        {response?.pinned?.repos?.map((repo) => (
          <List.Item
            key={repo.fullPath}
            id={repo.id}
            title={repo.name}
            icon={repo.icon}
            accessoryTitle={tildifyPath(repo.fullPath)}
            keywords={[repo.name]}
            accessoryIcon={Icon.Pin}
            actions={<SearchProjectActionPanel repo={repo} preferences={preferences} pinned />}
          />
        ))}
      </List.Section>

      <List.Section title={response?.recent?.sectionTitle}>
        {response?.recent?.repos?.map((repo) => (
          <List.Item
            key={repo.fullPath}
            id={repo.id}
            title={repo.name}
            icon={repo.icon}
            accessoryTitle={tildifyPath(repo.fullPath)}
            keywords={[repo.name]}
            actions={<SearchProjectActionPanel repo={repo} preferences={preferences} />}
          />
        ))}
      </List.Section>

      <List.Section title={response?.all?.sectionTitle}>
        {response?.all?.repos?.map((repo) => (
          <List.Item
            key={repo.fullPath}
            id={repo.id}
            title={repo.name}
            icon={repo.icon}
            accessoryTitle={tildifyPath(repo.fullPath)}
            keywords={[repo.name]}
            actions={<SearchProjectActionPanel repo={repo} preferences={preferences} />}
          />
        ))}
      </List.Section>
    </List>
  );
}
