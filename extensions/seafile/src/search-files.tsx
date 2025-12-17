import { Action, ActionPanel, getPreferenceValues, Icon, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { filesize } from "filesize";

const { username, password } = getPreferenceValues<Preferences>();
const SEAFILE_URL = "https://plus.seafile.com/";
const API_URL = SEAFILE_URL + "api2/";
const API_HEADERS = {
  accept: "application/json", "content-type": "application/json"
}
const useToken = () =>
  useCachedPromise(async () => {
    const token = await LocalStorage.getItem<string>("SEAFILE-ACCOUNT-TOKEN");
    if (token) return token;
    const response = await fetch(API_URL + "auth-token/", {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    if (!response.ok) {
      const err = result as Record<string, string[]>;
      throw new Error(`${Object.keys(err)[0]}: ${err[Object.keys(err)[0]]}`);
    }
    const newToken = (result as { token: string }).token;
    await LocalStorage.setItem("SEAFILE-ACCOUNT-TOKEN", newToken);
    return newToken;
  });
export default function SearchFiles() {
  const [searchText, setSearchText] = useState("");
  const { isLoading: isLoadingToken, data: token } = useToken();
  const { isLoading: isLoadingFiles, data: results } = useCachedPromise(
    (q: string) => async (options) => {
      const response = await fetch(API_URL + `search/?q=${q}&page=${options.page + 1}&per_page=25`, {
        headers: { ...API_HEADERS, Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) {
        const err = result as { detail: string };
        throw new Error(err.detail);
      }
      const data = result as {
        total: number;
        results: Array<{
          fullpath: string;
          is_dir: boolean;
          mtime: number;
          name: string;
          repo_id: string;
          score: number;
          size: number | null;
          repo_name: string;
          repo_owner_email: string;
        }>;
        has_more: boolean;
      };
      return {
        data: data.results,
        hasMore: data.has_more,
      };
    },
    [searchText],
    {
      execute: !!token,
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoadingToken || isLoadingFiles} onSearchTextChange={setSearchText} throttle>
      {results.map((result) => (
        <List.Item
          key={result.fullpath}
          icon={{
            source: result.is_dir ? "lib.png" : `${result.fullpath.split(".").pop()}.png`,
            fallback: Icon.Document,
          }}
          title={result.name}
          subtitle={result.fullpath}
          accessories={[
            { text: result.size ? filesize(result.size) : undefined },
            { date: new Date(result.mtime * 1000) },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`${SEAFILE_URL}${result.is_dir ? "library" : "lib"}/${result.repo_id}${result.is_dir ? "" : "/file"}${encodeURI(result.fullpath === "/" ? result.name : result.fullpath)}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
