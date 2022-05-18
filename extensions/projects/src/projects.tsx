import { getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, ReactElement } from "react";
import { SearchProjectActionPanel } from "./action-panel";
import { Preferences, SourceRepo } from "./types";
import { tildifyPath, useRepoCache } from "./projects-service";
import applicationConfig from "./application-config.json";

export default function Main(): ReactElement {
  const searchPlaceholders = applicationConfig.searchPlaceholders;

  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>();
  const { response, error, isLoading } = useRepoCache(searchText);

  if (error) {
    showToast(Toast.Style.Failure, "", error);
  }

  const getListSection = (section: { sectionTitle: string; repos: SourceRepo[] }, isPinned: boolean) => {
    return (
      <List.Section title={section?.sectionTitle}>
        {section?.repos?.map((repo) => (
          <List.Item
            key={repo.fullPath}
            id={repo.id}
            title={repo.name}
            icon={repo.icon}
            accessoryTitle={tildifyPath(repo.fullPath)}
            keywords={[repo.name]}
            accessoryIcon={isPinned ? Icon.Pin : ""}
            subtitle={repo.type}
            actions={<SearchProjectActionPanel repo={repo} preferences={preferences} pinned={isPinned} />}
          />
        ))}
      </List.Section>
    );
  };

  return (
    <List
      searchBarPlaceholder={searchPlaceholders[Math.floor(Math.random() * searchPlaceholders.length)]}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
    >
      {response?.pinned && getListSection(response?.pinned, true)}
      {response?.recent && getListSection(response?.recent, false)}
      {response?.all && getListSection(response?.all, false)}
    </List>
  );
}
