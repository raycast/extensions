import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { io } from "socket.io-client";
import { useEffect, useMemo, useState } from "react";
import { CurrentPlayer } from "./now-playing";
import { fetch } from "cross-fetch";

interface SocketResponseBase {
  type: string;
  data: unknown;
}

interface PlaybackTimeDidChangeResponse extends SocketResponseBase {
  type: "playbackStatus.playbackTimeDidChange";
  data: {
    currentPlaybackTime: number;
  };
}

interface PlaybackStatusDidChangeResponse extends SocketResponseBase {
  type: "playbackStatus.playbackStateDidChange";
  data: {
    playParams?: {
      id: string;
      catalogId?: string;
    };
    attributes?: {
      playParams?: {
        id: string;
        catalogId?: string;
      };
    };
  };
}

type SocketResponse =
  | PlaybackTimeDidChangeResponse
  | PlaybackStatusDidChangeResponse;

interface Lyric {
  start: number;
  text: string;
  empty: boolean;
}

export default function Command() {
  const [time, setTime] = useState<number>(0);
  const [lyrics, setLyrics] = useState<Lyric[] | null>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const socket = useMemo(() => io("http://localhost:10767"), []);

  async function getCurrentId(): Promise<string | number | null> {
    const res = await fetch(
      "http://localhost:10767/api/v1/playback/now-playing",
    );
    const data: CurrentPlayer = await res.json();
    return data.info.playParams?.catalogId || data.info.playParams?.id || null;
  }

  async function getLyrics(songId: string | number) {
    const res = await fetch("http://localhost:10767/api/v1/lyrics/" + songId);
    return await res.json();
  }

  async function seekTo(position: number) {
    await fetch("http://localhost:10767/api/v1/playback/seek", {
      method: "POST",
      body: JSON.stringify({ position }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  useEffect(() => {
    getCurrentId().then((id) => {
      if (!id) return;
      getLyrics(id).then((lyrics: Lyric[]) => setLyrics(lyrics));
    });

    const handlePlayback = async (data: SocketResponse) => {
      setIsLoading(false);
      if (data.type === "playbackStatus.playbackTimeDidChange")
        setTime(data.data.currentPlaybackTime + 0.25);
      if (data.type === "playbackStatus.playbackStateDidChange") {
        const playParams =
          data.data.playParams || data.data.attributes?.playParams;
        const id = playParams?.catalogId || playParams?.id;
        if (!id) return setLyrics(null);
        setLyrics(await getLyrics(id));
      }
    };

    socket.on("API:Playback", handlePlayback);

    return () => {
      socket.off("API:Playback", handlePlayback);
    };
  }, []);

  useEffect(() => {
    if (!lyrics) return;
    const currentIndex = lyrics.findIndex((lyric) => lyric.start > time);
    if (currentIndex === -1) return setSelectedIndex(lyrics.length - 1);
    setSelectedIndex(currentIndex - 1);
  }, [time]);

  return (
    <List isLoading={isLoading} selectedItemId={selectedIndex.toString()}>
      <List.EmptyView
        title={"No Lyrics Found"}
        description={
          "This song doesn't have any lyrics or Cider's API isn't currently available."
        }
        icon={Icon.EmojiSad}
      />
      {lyrics?.map((lyric, index) => (
        <List.Item
          id={index.toString()}
          key={index}
          title={lyric.empty ? "..." : lyric.text}
          icon={index <= selectedIndex ? Icon.CircleFilled : Icon.Circle}
          actions={
            <ActionPanel>
              <Action
                title={"Jump to Lyric"}
                onAction={() => seekTo(lyric.start - 0.25)}
                icon={Icon.ArrowUpCircle}
              />
              <Action.CopyToClipboard
                title={"Copy Lyric"}
                content={lyric.text}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
