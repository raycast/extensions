import { ActionPanel, Action, List, showToast, Toast, getPreferenceValues, Icon, showInFinder } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { createContext, useContext, useEffect, useState } from "react";
import { URLSearchParams } from "node:url";

import path from "node:path";
import fs from "node:fs/promises";

const DownloadDirectoryContext = createContext<string | null>(null);

const useDownloadDirectory = () => {
  const downloadDirectory = useContext(DownloadDirectoryContext);
  if (!downloadDirectory) {
    throw new Error("DownloadDirectoryContext is not provided");
  }
  return downloadDirectory;
};

const PER_PAGE = 24;

export default function Command() {
  const [query, setQuery] = useState("");
  const url = query.length === 0 ? "https://slackmojis.com/emojis.json" : "https://slackmojis.com/emojis/search.json?";
  const { data, isLoading, pagination } = useFetch(
    (options) => {
      const searchUrl = url + new URLSearchParams({ page: String(options.page), query }).toString();
      return searchUrl;
    },
    {
      mapResult(result: SearchResult[]) {
        return {
          data: result,
          hasMore: result.length === PER_PAGE,
        };
      },

      keepPreviousData: true,
      initialData: [],
      parseResponse: parseFetchResponse,
      execute: query.length > 0,
    },
  );

  const preferences = getPreferenceValues();
  const downloadDirectory = preferences.downloadDirectory;

  return (
    <DownloadDirectoryContext.Provider value={downloadDirectory}>
      <List
        isShowingDetail
        isLoading={query.length > 0 && isLoading}
        pagination={pagination}
        onSearchTextChange={setQuery}
        searchBarPlaceholder="Search for a slackmoji..."
        throttle
      >
        {query.length > 0 ? (
          isLoading && data.length === 0 ? (
            <List.EmptyView title="Searching..." />
          ) : (
            <List.Section title="Results" subtitle={data?.length + ""}>
              {data?.map((searchResult) => {
                return <SearchListItem key={searchResult.id} searchResult={searchResult} />;
              })}
            </List.Section>
          )
        ) : (
          <List.EmptyView title="Type something to get started" />
        )}
      </List>
    </DownloadDirectoryContext.Provider>
  );
}

interface SearchListItemProps {
  searchResult: SearchResult;
}

function SearchListItem({ searchResult }: SearchListItemProps) {
  const [shouldDownload, setShouldDownload] = useState(false);
  const downloadDirectory = useDownloadDirectory();
  const [hasDownloaded, setHasDownloaded] = useState<string | null>(null);
  const { data, isLoading, error } = useFetch(searchResult.image_url, {
    parseResponse: async (response: Response) => {
      return new Uint8Array(await response.arrayBuffer());
    },
    execute: shouldDownload,
  });

  useEffect(() => {
    if (isLoading) {
      showToast({
        title: "Downloading",
        message: searchResult.name,
        style: Toast.Style.Animated,
      });
    }
  }, [isLoading]);

  useEffect(() => {
    if (error) {
      showToast({
        title: "Failed to download",
        message: searchResult.name,
        style: Toast.Style.Failure,
      });
    }
  }, [error]);

  useEffect(() => {
    if (!data || !data.length || !shouldDownload) return;
    setHasDownloaded(null);
    // const downloadPath = path.join(require('os').homedir(), 'Downloads');
    const downloadPath = downloadDirectory;
    const name = searchResult.image_url.split("/").pop()?.split("?")[0];
    const downloadPathWithName = path.join(downloadPath, name ?? "");
    const buffer = Buffer.from(data);
    showToast({
      title: "Downloading",
      message: name,
      style: Toast.Style.Animated,
    });
    fs.writeFile(downloadPathWithName, buffer, "binary")
      .catch(() => {
        showToast({
          title: "Failed to download",
          message: name,
          style: Toast.Style.Failure,
        });
      })
      .then(() => {
        showToast({
          title: "Downloaded",
          message: name,
          style: Toast.Style.Success,
        });

        setHasDownloaded(downloadPathWithName);
        showInFinder(downloadPathWithName);
      })
      .finally(() => {
        setShouldDownload(false);
      });
  }, [data, shouldDownload]);

  return (
    <List.Item
      icon={searchResult.image_url}
      title={searchResult.name}
      detail={<List.Item.Detail markdown={`![preview](${searchResult.image_url})`} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Download" onAction={() => setShouldDownload(true)} icon={Icon.Download} />
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.image_url} icon={Icon.Window} />
            <Action.CopyToClipboard
              title="Copy URL to Clipboard"
              content={searchResult.image_url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              icon={Icon.Link}
            />
            {hasDownloaded && (
              <Action title="Reveal in Finder" onAction={() => showInFinder(hasDownloaded)} icon={Icon.Folder} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

type EmojiCategory = {
  id: number;
  name: string;
};

type Emoji = {
  id: number;
  name: string;
  credit: string;
  created_at: string;
  updated_at: string;
  image_url: string;
  category: EmojiCategory;
};

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as Emoji[];

  if (!response.ok || "message" in json) {
    showToast({
      title: "Failed to fetch emojis",
      message: "An error occurred",
      style: Toast.Style.Failure,
    });
  }

  return json.map(({ name, image_url }) => {
    // Extract emoji ID from the image_url using regex
    // image_url example: "https://emojis.slackmojis.com/emojis/images/[id:int]/27252/pear.gif?[id:int]"
    const id = image_url.match(/images\/(\d+)/)?.[1] ?? "";

    return {
      name,
      image_url,
      id,
    } as SearchResult;
  });
}

interface SearchResult {
  name: string;
  image_url: string;
  id: string;
}
