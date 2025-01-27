import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { parseFromMillis } from "./now-playing";
import { callCider } from "./functions";

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
      const data = (await callCider("/playback/queue", "GET", undefined, true)) as queueItem[];
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
    await callCider("/playback/queue/clear-queue", "POST");
  }

  async function playSong(song: queueItem) {
    await callCider("/playback/queue/change-to-index", "POST", {
      index: queue.indexOf(song),
    });
  }

  async function moveSong(song: queueItem, direction: "up" | "down") {
    const startIndex = queue.indexOf(song);
    await callCider("/playback/queue/move-to-position", "POST", {
      startIndex,
      destinationIndex: startIndex + (direction === "up" ? -1 : 1),
    });
    const newQueue = [...queue];
    const temp = newQueue[startIndex];
    newQueue[startIndex] = newQueue[startIndex + (direction === "up" ? -1 : 1)];
    newQueue[startIndex + (direction === "up" ? -1 : 1)] = temp;
    setQueue(newQueue);
  }

  async function removeSong(song: queueItem) {
    const index = queue.indexOf(song);
    await callCider("/playback/queue/remove-by-index", "POST", { index });
    const newQueue = [...queue];
    newQueue.splice(index, 1);
    setQueue(newQueue);
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
      {queue.map((item) => (
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
                  <List.Item.Detail.Metadata.Label title={"Name"} text={item.attributes.name} />
                  <List.Item.Detail.Metadata.Label title={"Artist"} text={item.attributes.artistName || "Unknown"} />
                  <List.Item.Detail.Metadata.Label title={"Album"} text={item.attributes.albumName || "Unknown"} />
                  <List.Item.Detail.Metadata.Label
                    title={"Genre" + (item.attributes.genreNames.length > 1 ? "s" : "")}
                    text={item.attributes.genreNames.join(", ") || "Unknown"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title={"Duration"}
                    text={parseFromMillis(item.attributes.durationInMillis)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title={"Release Date"}
                    text={new Date(item.attributes.releaseDate).toLocaleDateString("en-GB")}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title={"Play"} icon={Icon.Play} onAction={() => playSong(item)} />
              <Action
                title={"Remove"}
                icon={Icon.Trash}
                onAction={() => removeSong(item)}
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
              />
              <Action title={"Clear Queue"} style={Action.Style.Destructive} icon={Icon.Xmark} onAction={clearQueue} />
              {queue.indexOf(item) !== 0 && (
                <Action
                  title={"Move Up"}
                  icon={Icon.ArrowUp}
                  onAction={() => moveSong(item, "up")}
                  shortcut={Keyboard.Shortcut.Common.MoveUp}
                />
              )}
              {queue.indexOf(item) !== queue.length - 1 && (
                <Action
                  title={"Move Down"}
                  icon={Icon.ArrowDown}
                  onAction={() => moveSong(item, "down")}
                  shortcut={Keyboard.Shortcut.Common.MoveDown}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
