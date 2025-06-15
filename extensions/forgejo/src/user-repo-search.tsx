import { Action, ActionPanel, Icon, Color, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { baseUrl } from "./constants/global.constant";
import { Repo } from "./interfaces/repo.search.interface";
import SearchDropdown from "./components/SearchDropdown";
import { userSearchTypes } from "./types/repo.search.type";

export default function Command() {
  const { serverUrl, accessToken } = getPreferenceValues<{ serverUrl: string; accessToken: string }>();
  const [searchText, setSearchText] = useState("");
  const [userSearchType, setUserSearchType] = useState("all");
  let searchUrl = serverUrl;

  switch (userSearchType) {
    case "star":
      searchUrl = serverUrl + baseUrl + `/user/starred?token=${accessToken}&limit=20`;
      break;
    default:
      searchUrl = serverUrl + baseUrl + `/user/repos?token=${accessToken}&limit=20`;
      break;
  }

  const { isLoading, data } = useFetch<Repo[]>(searchUrl);
  const dataArray = Array.isArray(data) ? data : [];

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <SearchDropdown repoSortTypes={userSearchTypes} onSearchTypeChange={(type) => setUserSearchType(type)} />
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
