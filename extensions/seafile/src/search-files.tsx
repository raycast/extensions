import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { filesize } from "filesize";
import { type FileDetails, SearchResult } from "./types";
import { makeRequest, SEAFILE_URL } from "./seafile";

const buildSearchResultUrl = (result: SearchResult) => {
  let url = SEAFILE_URL;
  url += result.is_dir ? "library" : "lib";
  url += `/${result.repo_id}`;
  if (!result.is_dir) url += "/file";
  url += encodeURI(result.fullpath === "/" ? `/${result.name}` : result.fullpath);
  return url;
};

export default function SearchFiles() {
  const [searchText, setSearchText] = useState("");
  const {
    isLoading,
    data: results,
    error,
  } = useCachedPromise(
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

  if (error?.message === "Invalid URL")
    return (
      <Detail
        markdown={`# ERROR \n\n Invalid URL \n Please make sure URL in Preferences is valid`}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
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
                    title="Download"
                    onAction={async () => {
                      const toast = await showToast(Toast.Style.Animated, "Starting Download", result.name);
                      try {
                        const url = await makeRequest<string>(
                          `repos/${result.repo_id}/file/?p=${encodeURIComponent(result.fullpath)}`,
                        );
                        toast.style = Toast.Style.Success;
                        toast.title = "Download Started";
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
