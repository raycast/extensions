import { Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { callCider } from "./functions";
import { Lyric } from "./synced-lyrics";

declare global {
  interface Number {
    pad(n: number): string;
  }
}

Number.prototype.pad = function (n: number) {
  return (new Array(n).join("0") + this).slice(-n);
};

function parseFromSeconds(duration: number) {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60).pad(2);
  return `${minutes}:${seconds}`;
}

export function parseFromMillis(duration: number) {
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000).pad(2);
  return `${minutes}:${seconds}`;
}

export interface CurrentPlayer {
  info: {
    albumName: string;
    genreNames: string[];
    durationInMillis: number;
    hasLyrics: boolean;
    releaseDate: string;
    artistName: string;
    artwork: {
      width: number;
      height: number;
      url: string;
    };
    name: string;
    status: string;
    currentPlaybackTime: number;
    playParams: {
      id: string;
      catalogId?: string;
    };
  };
}

export default function Command() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [songName, setSongName] = useState<string>("Loading...");
  const [artistName, setArtistName] = useState<string>("Loading...");
  const [albumName, setAlbumName] = useState<string>("Loading...");
  const [genreNames, setGenreNames] = useState<string[]>([]);
  const [songDuration, setSongDuration] = useState<number>(0);
  const [songPosition, setSongPosition] = useState<number>(0);
  const [albumArt, setAlbumArt] = useState<string>("Loading...");
  const [lyrics, setLyrics] = useState<string>("Loading...");
  const [hasLyrics, setHasLyrics] = useState<boolean>(false);
  const [releaseDate, setReleaseDate] = useState<string>("Loading...");
  const [isShowingDetail, setISD] = useState<boolean>(false);
  const [id, setId] = useState<string | null>(null);

  async function fetchCurrentPlayer() {
    try {
      const res = ((await callCider("/playback/now-playing", "GET", undefined, true)) as CurrentPlayer).info;
      if (!res.playParams) {
        setIsPlaying(false);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setSongName(res.name || "Unknown Title");
      setArtistName(res.artistName || "Unknown Artist");
      setAlbumName(res.albumName || "Unknown Album");
      setGenreNames(res.genreNames || []);
      setHasLyrics(res.hasLyrics || false);
      setSongDuration(res.durationInMillis || 0);
      setSongPosition(res.currentPlaybackTime || 0);
      setAlbumArt(
        res.artwork.url.replace("{w}x{h}", `${res.artwork.width}x${res.artwork.height}`) || "Unknown Artwork",
      );
      setReleaseDate(new Date(res.releaseDate).toLocaleDateString("en-US") || "Unknown Date");
      setIsPlaying(true);
      setId(res.playParams.catalogId || res.playParams.id || null);
    } catch (e) {
      setIsPlaying(false);
      setIsLoading(false);
    }
  }

  function changeISD(id: string | null) {
    if (id === "albumArt" || id === "lyrics") {
      setISD(true);
    } else {
      setISD(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      await fetchCurrentPlayer();
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchLyrics = async () => {
      try {
        const data = (await callCider("/lyrics/" + id)) as Lyric[];
        setLyrics(data.map((line: { text: string }) => line.text).join("\n\n") || "No Lyrics Found");
      } catch {
        setLyrics("No Lyrics Found");
      }
    };

    fetchLyrics().then();
  }, [id]);

  return (
    <List isShowingDetail={isShowingDetail} isLoading={isLoading} onSelectionChange={(id) => changeISD(id)}>
      {isPlaying ? (
        <>
          <List.Item title={songName} subtitle={`🎵 Title`} />
          <List.Item title={artistName} subtitle={`🎤 Artist`} />
          <List.Item title={albumName} subtitle={`💿 Album`} />
          <List.Item title={genreNames.join(", ")} subtitle={`🎶 Genre`} />
          <List.Item
            title={"Album Art"}
            id={"albumArt"}
            subtitle={"Select to View"}
            detail={<List.Item.Detail markdown={`![Album Art](${albumArt})`} />}
          />
          {hasLyrics && (
            <List.Item
              title={"Lyrics"}
              id={"lyrics"}
              subtitle={"Select to View"}
              detail={<List.Item.Detail markdown={lyrics} />}
            />
          )}
          <List.Item
            title={`${parseFromSeconds(songPosition)} / ${parseFromMillis(songDuration)}`}
            subtitle={`⏱️ Duration`}
          />
          <List.Item title={releaseDate} subtitle={`📅 Release Date`} />
        </>
      ) : (
        <List.EmptyView title={"Not Playing"} description={"Try Playing Something First"} icon={Icon.Music} />
      )}
    </List>
  );
}
