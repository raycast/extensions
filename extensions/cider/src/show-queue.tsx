import { fetch } from "cross-fetch";
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { parseFromMillis } from "./now-playing";

interface queueItem {
  id: string;
  _state: {
    current: number;
  };
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    genreNames: string[];
    durationInMillis: number;
    releaseDate: string;
    artwork?: {
      width: number;
      height: number;
      url: string;
    };
  };
}

export default function Command() {
  const [queue, setQueue] = useState<queueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const toastShownRef = useRef(false);

  async function fetchQueue() {
    try {
      const res = await fetch("http://localhost:10767/api/v1/playback/queue", {
        signal: AbortSignal.timeout(3000),
      });
      const data = (await res.json()) as queueItem[];
      setQueue(data);
      setIsLoading(false);
      if (toastShownRef.current) {
        await showToast({
          style: Toast.Style.Success,
          title: "Queue Updated",
          message: "The queue has been updated successfully.",
        });
        toastShownRef.current = false;
      }
    } catch {
      setIsLoading(false);
      if (toastShownRef.current) return;
      await showToast({
        title: "Couldn't Connect to Cider",
        message: "Attempting again.",
        style: Toast.Style.Animated,
      });
      toastShownRef.current = true;
    }
  }

  async function clearQueue() {
    await fetch(`http://localhost:10767/api/v1/playback/queue/clear-queue`, {
      method: "POST",
    });
  }

  async function playSong(song: queueItem) {
    await fetch(
      `http://localhost:10767/api/v1/playback/queue/change-to-index`,
      {
        method: "POST",
        body: JSON.stringify({ index: queue.indexOf(song) }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  async function moveSong(song: queueItem, direction: "up" | "down") {
    const startIndex = queue.indexOf(song);
    const res = await fetch(
      `http://localhost:10767/api/v1/playback/queue/move-to-position`,
      {
        method: "POST",
        body: JSON.stringify({
          startIndex,
          destinationIndex: startIndex + (direction === "up" ? -1 : 1),
          returnQueue: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    const data = (await res.json()) as queueItem[];
    setQueue(data);
  }

  async function removeSong(song: queueItem) {
    await fetch(
      `http://localhost:10767/api/v1/playback/queue/remove-by-index`,
      {
        method: "POST",
        body: JSON.stringify({ index: queue.indexOf(song) }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      await fetchQueue();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={queue.length !== 0}>
      <List.EmptyView
        title={"Oops"}
        description={
          "Cider isn't able to communicate the queue at the time. It is either empty or too large. Please try again later."
        }
        icon={Icon.EmojiSad}
      />
      {queue
        .filter((item) => item._state.current <= 2)
        .map((item) => (
          <List.Item
            key={item.id}
            title={item.attributes.name}
            subtitle={item.attributes.artistName}
            icon={{
              source:
                item.attributes.artwork?.url.replace(
                  "{w}x{h}",
                  `${item.attributes.artwork.width}x${item.attributes.artwork.height}`,
                ) || Icon.Music,
            }}
            detail={
              <List.Item.Detail
                markdown={`![cover](${item.attributes.artwork?.url.replace("{w}x{h}", `${item.attributes.artwork.width}x${item.attributes.artwork.height}`)})`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title={"Name"}
                      text={item.attributes.name}
                    />
                    <List.Item.Detail.Metadata.Label
                      title={"Artist"}
                      text={item.attributes.artistName || "Unknown"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title={"Album"}
                      text={item.attributes.albumName || "Unknown"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title={
                        "Genre" +
                        (item.attributes.genreNames.length > 1 ? "s" : "")
                      }
                      text={item.attributes.genreNames.join(", ") || "Unknown"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title={"Duration"}
                      text={parseFromMillis(item.attributes.durationInMillis)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title={"Release Date"}
                      text={new Date(
                        item.attributes.releaseDate,
                      ).toLocaleDateString("en-GB")}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={"Play"}
                  icon={Icon.Play}
                  onAction={() => playSong(item)}
                />
                <Action
                  title={"Remove"}
                  icon={Icon.Trash}
                  onAction={() => removeSong(item)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                />
                <Action
                  title={"Clear Queue"}
                  style={Action.Style.Destructive}
                  icon={Icon.Xmark}
                  onAction={clearQueue}
                />
                <Action
                  title={"Move Up"}
                  icon={Icon.ArrowUp}
                  onAction={() => moveSong(item, "up")}
                  shortcut={Keyboard.Shortcut.Common.MoveUp}
                />
                <Action
                  title={"Move Down"}
                  icon={Icon.ArrowDown}
                  onAction={() => moveSong(item, "down")}
                  shortcut={Keyboard.Shortcut.Common.MoveDown}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
