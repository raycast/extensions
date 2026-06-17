import { List, ActionPanel, Action, showHUD, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { makeVLCRequest } from "./utils";

interface PlaylistItem {
  id: string;
  name: string;
  uri: string;
  current?: string;
  duration?: number;
}

interface PlaylistNode {
  id: string;
  name: string;
  uri?: string;
  current?: string;
  duration?: number;
  children?: PlaylistNode[];
}

interface PlaylistResponse {
  children?: PlaylistNode[];
}

export default function Command() {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlaylist();
  }, []);

  async function fetchPlaylist() {
    try {
      const { vlc_password } = getPreferenceValues();
      const auth = Buffer.from(`:${vlc_password}`).toString("base64");

      const response = await fetch("http://localhost:8080/requests/playlist.json", {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch playlist: ${response.status}`);
      }

      const data = (await response.json()) as PlaylistResponse;
      const playlistItems = flattenPlaylist(data);
      setItems(playlistItems);
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to fetch playlist",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function flattenPlaylist(data: PlaylistResponse): PlaylistItem[] {
    const items: PlaylistItem[] = [];

    function traverse(nodes: PlaylistNode[] | undefined) {
      if (!nodes) return;

      for (const node of nodes) {
        if (node.uri && node.uri !== "") {
          items.push({
            id: node.id,
            name: node.name || "Untitled",
            uri: node.uri,
            current: node.current,
            duration: node.duration,
          });
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    }

    traverse(data.children);
    return items;
  }

  async function playItem(itemId: string) {
    try {
      await makeVLCRequest({ command: "pl_play", parameters: { id: itemId } });
      await showHUD("▶️ Playing item");
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to play item",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function formatDuration(seconds: number | undefined): string {
    if (!seconds || seconds < 0) return "";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search playlist...">
      {items.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.List} title="No Items in Playlist" description="The VLC playlist is empty" />
      ) : (
        items.map((item) => {
          const isCurrentlyPlaying = item.current === "current";
          const accessories = [];

          if (item.duration) {
            accessories.push({ text: formatDuration(item.duration) });
          }

          if (isCurrentlyPlaying) {
            accessories.push({ icon: Icon.Play, tooltip: "Currently Playing" });
          }

          return (
            <List.Item
              key={item.id}
              title={item.name}
              subtitle={decodeURIComponent(item.uri)}
              icon={isCurrentlyPlaying ? Icon.Play : Icon.Document}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action title="Play" icon={Icon.Play} onAction={() => playItem(item.id)} />
                  <Action.CopyToClipboard title="Copy File Path" content={decodeURIComponent(item.uri)} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
