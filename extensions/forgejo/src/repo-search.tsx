import { Action, ActionPanel, Icon, Color, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { baseUrl } from "./constants/global.constant";
import { RepoSearchResponse } from "./interfaces/repo.search.interface";
import SearchDropdown from "./components/SearchDropdown";
import { repoSortTypes } from "./types/repo.search.type";

export default function Command() {
  const { serverUrl, accessToken } = getPreferenceValues<{ serverUrl: string; accessToken: string }>();
  const [searchText, setSearchText] = useState("");
  const [repoSortType, setRepoSortType] = useState("most stars");

  let searchUrl = serverUrl;

  switch (repoSortType) {
    case "fewest stars":
      searchUrl =
        serverUrl + baseUrl + `/repos/search?token=${accessToken}&q=${searchText}&limit=20&sort=stars&order=asc`;
      break;
    case "newest":
      searchUrl =
        serverUrl + baseUrl + `/repos/search?token=${accessToken}&q=${searchText}&limit=20&sort=created&order=desc`;
      break;
    case "oldest":
      searchUrl =
        serverUrl + baseUrl + `/repos/search?token=${accessToken}&q=${searchText}&limit=20&sort=created&order=asc`;
      break;
    case "recently updated":
      searchUrl =
        serverUrl + baseUrl + `/repos/search?token=${accessToken}&q=${searchText}&limit=20&sort=updated&order=desc`;
      break;
    case "least recently updated":
      searchUrl =
        serverUrl + baseUrl + `/repos/search?token=${accessToken}&q=${searchText}&limit=20&sort=updated&order=asc`;
      break;
    default:
      searchUrl =
        serverUrl + baseUrl + `/repos/search?token=${accessToken}&q=${searchText}&limit=20&sort=stars&order=desc`;
      break;
  }

  const { isLoading, data } = useFetch<RepoSearchResponse>(searchUrl);

  const dataArray = data?.ok && Array.isArray(data.data) ? data.data : [];

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <SearchDropdown repoSortTypes={repoSortTypes} onSearchTypeChange={(type) => setRepoSortType(type)} />
      }
      throttle
    >
      {dataArray.map((item) => {
        item.starsCount = item.stars_count?.toString() ?? "0";
        return (
          <List.Item
            key={item.id}
            title={item.full_name}
            subtitle={item.description}
            icon={`${item.avatar_url}`}
            accessories={[
              { text: { value: item.language, color: Color.PrimaryText } },
              { text: item.starsCount, icon: Icon.Star },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={item.html_url} />
                <Action.CopyToClipboard title="Copy to Clipboard" content={item.html_url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
