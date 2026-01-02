import { ActionPanel, Action, List, getPreferenceValues, showToast, Toast, Clipboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo } from "react";

interface Preferences {
  apiKey: string;
}

interface TorrentFile {
  id: number;
  name: string;
  size: number;
  short_name: string;
}

interface Torrent {
  id: number;
  hash: string;
  name: string;
  size: number;
  progress: number;
  download_state: string;
  download_speed: number;
  upload_speed: number;
  seeders: number;
  download_present: boolean;
  download_finished: boolean;
  files: TorrentFile[];
  created_at: string;
  updated_at: string;
}

interface TorBoxResponse {
  success: boolean;
  data: Torrent[];
  detail?: string;
}

interface DownloadLinkResponse {
  success: boolean;
  data: string;
  detail?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function getDownloadLink(apiKey: string, torrentId: number, fileId?: number): Promise<string> {
  const params = new URLSearchParams({
    token: apiKey,
    torrent_id: torrentId.toString(),
  });

  if (fileId !== undefined) {
    params.append("file_id", fileId.toString());
  }

  const response = await fetch(`https://api.torbox.app/v1/api/torrents/requestdl?${params}`);
  const json = (await response.json()) as DownloadLinkResponse;

  if (!response.ok || !json.success) {
    throw new Error(json.detail || "Failed to get download link");
  }

  return json.data;
}

function TorrentListItem({ torrent, apiKey }: { torrent: Torrent; apiKey: string }) {
  return (
    <List.Item
      title={torrent.name}
      subtitle={formatBytes(torrent.size)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Copy Download Link"
              onAction={async () => {
                try {
                  await showToast({ style: Toast.Style.Animated, title: "Getting download link..." });
                  const link = await getDownloadLink(apiKey, torrent.id);
                  await Clipboard.copy(link);
                  await showToast({ style: Toast.Style.Success, title: "Download link copied!" });
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to get download link",
                    message: error instanceof Error ? error.message : "Unknown error",
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error } = useFetch<TorBoxResponse>(
    `https://api.torbox.app/v1/api/torrents/mylist?bypass_cache=false`,
    {
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
      keepPreviousData: true,
    },
  );

  const filteredTorrents = useMemo(() => {
    if (!data?.data) return [];

    const torrents = data.data;

    if (searchText.length === 0) {
      return torrents.slice(0, 10);
    }

    const searchLower = searchText.toLowerCase();

    return torrents.filter((torrent) => torrent.name.toLowerCase().includes(searchLower));
  }, [data, searchText]);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch downloads",
      message: error.message,
    });
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your TorBox downloads..."
      throttle
    >
      <List.Section title={searchText ? "Search Results" : "Recent Downloads"} subtitle={`${filteredTorrents.length}`}>
        {filteredTorrents.map((torrent) => (
          <TorrentListItem key={torrent.id} torrent={torrent} apiKey={preferences.apiKey} />
        ))}
      </List.Section>
    </List>
  );
}
