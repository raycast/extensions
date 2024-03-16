import { useState } from "react";
import {
  ActionPanel,
  List,
  Action,
  Detail,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ApiResponse, RaycastExtPreferences } from "./types";

const DISCOGS_API_URL = "https://api.discogs.com";
const DISCOGS_WEB_URL = "https://discogs.com";

const MissingPATScreen = () => {
  const markdown =
    "Missing Personal Access Token. Please update your extension preferences and try again.";

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
};

const getApiUrl = (searchText: string, token: string) =>
  `${DISCOGS_API_URL}/database/search?q=${searchText}&format=Vinyl&token=${token}`;

export default function Command() {
  const { token } = getPreferenceValues<RaycastExtPreferences>();
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch<ApiResponse>(
    getApiUrl(searchText, token),
    { keepPreviousData: true },
  );

  if (!token) {
    return <MissingPATScreen />;
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      filtering={false}
    >
      {!searchText.trim() ? (
        <List.EmptyView title="Type something to get started" />
      ) : (
        (data?.results || []).map((item) => (
          <List.Item
            icon={item.thumb}
            title={item.title}
            accessories={[
              {
                text: item.user_data.in_collection
                  ? `📗`
                  : item.user_data.in_wantlist
                    ? "👀"
                    : null,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`${DISCOGS_WEB_URL}${item.uri}`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
