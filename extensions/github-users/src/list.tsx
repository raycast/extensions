import { useState } from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { useDebounce } from "./hooks/useDebounce";
import { UserDetail } from "./detail";
import { octokit, onRequestError } from "./utils";

export default function UsersGrid() {
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce<string>(searchText);

  const { isLoading, data } = useCachedPromise(
    async (query: string) => {
      const response = await octokit.rest.search.users({
        q: query === "" ? "followers:>0" : query,
        sort: "followers",
        order: "desc",
        per_page: 20,
        mediaType: { format: "json" },
      });
      return response.data;
    },
    [debouncedSearchText],
    {
      keepPreviousData: true,
      onError: onRequestError,
    }
  );

  return (
    <Grid searchText={searchText} onSearchTextChange={setSearchText} isLoading={isLoading}>
      {!isLoading &&
        data?.items.map(({ id, avatar_url, login, html_url }) => (
          <Grid.Item
            key={id}
            content={avatar_url}
            title={login}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`View ${login} Detail`}
                  target={<UserDetail username={login} avatarUrl={avatar_url} />}
                />
                <Action.OpenInBrowser title={`${login} GitHub Page`} url={html_url} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
