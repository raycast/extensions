import { getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, ReactElement } from "react";
import { SearchProjectActionPanel } from "./action-panel";
import { ListType, Preferences, SourceRepo } from "./types";
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

  const getListSection = (listType: ListType, section: { sectionTitle: string; repos: SourceRepo[] }) => {
    return (
      <List.Section title={section?.sectionTitle}>
        {section?.repos?.map((repo) => (
          <List.Item
            key={repo.fullPath}
            id={`${listType}:${repo.id}`}
            title={repo.name}
            icon={repo.icon}
            accessoryTitle={tildifyPath(repo.fullPath)}
            keywords={[repo.name]}
            accessoryIcon={listType == "pinned" ? Icon.Pin : ""}
            actions={<SearchProjectActionPanel repo={repo} preferences={preferences} listType={listType} />}
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
      {response?.pinned && getListSection("pinned", response?.pinned)}
      {response?.recent && getListSection("recent", response?.recent)}
      {response?.all && getListSection("all", response?.all)}
    </List>
  );
}
