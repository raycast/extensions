import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { filesize } from "filesize";
import { ErrorResult, type FileDetails, SearchResult } from "./types";

const { username, password } = getPreferenceValues<Preferences>();
const SEAFILE_URL = "https://plus.seafile.com/";
const API_URL = SEAFILE_URL + "api2/";
const API_HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
};

const parseResponse = async <T,>(response: Response) => {
  const result = await response.json();
  if (!response.ok) {
    const error = result as ErrorResult;
    if ("detail" in error) throw new Error(error.detail as string);
    if ("error_msg" in error) throw new Error(error.error_msg as string);
    throw new Error(`${Object.keys(error)[0]}: ${error[Object.keys(error)[0]]}`);
  }
  return result as T;
};
const getToken = async () => {
  const token = await LocalStorage.getItem<string>("SEAFILE-ACCOUNT-TOKEN");
  if (token) return token;
  const response = await fetch(API_URL + "auth-token/", {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ username, password }),
  });
  const result = await parseResponse<{ token: string }>(response);
  const newToken = result.token;
  await LocalStorage.setItem("SEAFILE-ACCOUNT-TOKEN", newToken);
  return newToken;
};
const makeRequest = async <T,>(endpoint: string) => {
  try {
    const token = await getToken();
    const response = await fetch(API_URL + endpoint, {
      headers: { ...API_HEADERS, Authorization: `Bearer ${token}` },
    });
    const result = await parseResponse<T>(response);
    return result;
  } catch (error) {
    const err = error as Error;
    if (err.message === "Invalid token") await LocalStorage.removeItem("SEAFILE-ACCOUNT-TOKEN");
    throw new Error(err.message);
  }
};

const buildSearchResultUrl = (result: SearchResult) => {
  let url = SEAFILE_URL;
  url += result.is_dir ? "library" : "lib";
  url += `/${result.repo_id}`;
  url += result.is_dir ? "" : "/file";
  url += encodeURI(result.fullpath === "/" ? `/${result.name}` : result.fullpath);
  return url;
};
export default function SearchFiles() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data: results } = useCachedPromise(
    (q: string) => async (options) => {
      const result = await makeRequest<{ total: number; results: SearchResult[]; has_more: boolean }>(
        `search/?q=${q}&page=${options.page + 1}&per_page=25`,
      );
      return {
        data: result.results,
        hasMore: result.has_more,
      };
    },
    [searchText],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search files" onSearchTextChange={setSearchText} throttle>
      {results.map((result) => (
        <List.Item
          key={result.fullpath}
          icon={{
            source:
              result.fullpath === "/"
                ? "lib.png"
                : result.is_dir
                  ? "folder-192.png"
                  : `${result.fullpath.split(".").pop()}.png`,
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
              {!result.is_dir && (
                <>
                  <Action.Push icon={Icon.Info} title="Properties" target={<FileDetails result={result} />} />
                  <Action
                    icon={Icon.Download}
                    title="Open Download URL"
                    onAction={async () => {
                      const toast = await showToast(Toast.Style.Animated, "Generating URL", result.name);
                      try {
                        const url = await makeRequest<string>(
                          `repos/${result.repo_id}/file/?p=${encodeURIComponent(result.fullpath)}`,
                        );
                        toast.style = Toast.Style.Success;
                        toast.title = "Opening URL";
                        await open(url);
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Failed";
                        toast.message = `${error}`;
                      }
                    }}
                  />
                </>
              )}
              <Action.OpenInBrowser url={buildSearchResultUrl(result)} shortcut={Keyboard.Shortcut.Common.Open} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function FileDetails({ result }: { result: SearchResult }) {
  const { isLoading, data } = useCachedPromise(
    async (repoId: string, p: string) => {
      const result = await makeRequest<FileDetails>(`repos/${repoId}/file/detail?p=${encodeURIComponent(p)}`);
      return result;
    },
    [result.repo_id, result.fullpath],
  );

  return (
    <Detail
      navigationTitle={result.fullpath}
      isLoading={isLoading}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Type">
              <Detail.Metadata.TagList.Item text={data.type} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="ID" text={data.id} />
            <Detail.Metadata.Label title="Name" text={data.name} />
          </Detail.Metadata>
        )
      }
    />
  );
}
