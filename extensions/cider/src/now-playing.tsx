import { Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetch } from "cross-fetch";

function parseFromSeconds(duration: number) {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds}`;
}

function parseFromMillis(duration: number) {
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}:${seconds}`;
}

interface currentPlayer {
  info: {
    albumName: string;
    durationInMillis: number;
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
  };
}

export default function Command() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [songName, setSongName] = useState<string>("Loading...");
  const [artistName, setArtistName] = useState<string>("Loading...");
  const [albumName, setAlbumName] = useState<string>("Loading...");
  const [songDuration, setSongDuration] = useState<number>(0);
  const [songPosition, setSongPosition] = useState<number>(0);
  const [songStatus, setSongStatus] = useState<string>("Loading...");
  const [albumArt, setAlbumArt] = useState<string>("Loading...");
  const [releaseDate, setReleaseDate] = useState<string>("Loading...");
  const [isShowingDetail, setISD] = useState<boolean>(false);

  async function fetchCurrentPlayer() {
    try {
      const res = (
        (await fetch("http://localhost:10769/currentPlayingSong").then((res) =>
          res.json(),
        )) as currentPlayer
      ).info;
      setSongName(res.name);
      setArtistName(res.artistName);
      setAlbumName(res.albumName);
      setSongDuration(res.durationInMillis);
      setSongPosition(res.currentPlaybackTime);
      setSongStatus(res.status);
      setAlbumArt(
        res.artwork.url.replace(
          "{w}x{h}",
          `${res.artwork.width}x${res.artwork.height}`,
        ),
      );
      setReleaseDate(new Date(res.releaseDate).toLocaleDateString());
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  // changeISD -> change isShowingDetail

  function changeISD(id: string | null) {
    if (id === "albumArt") {
      setISD(true);
    } else {
      setISD(false);
    }
  }

  useEffect(() => {
    setInterval(() => {
      // noinspection JSIgnoredPromiseFromCall
      fetchCurrentPlayer();
    }, 250);
  }, []);
  return (
    <List
      isShowingDetail={isShowingDetail}
      onSelectionChange={(id) => changeISD(id)}
    >
      {isPlaying ? (
        <>
          <List.Item title={songName} subtitle={`🎵 Title`} />
          <List.Item title={artistName} subtitle={`🎤 Artist`} />
          <List.Item title={albumName} subtitle={`💿 Album`} />
          <List.Item
            title={"Album Art"}
            id={"albumArt"}
            detail={<List.Item.Detail markdown={`![Album Art](${albumArt})`} />}
          />
          <List.Item
            title={`${parseFromSeconds(songPosition)} / ${parseFromMillis(
              songDuration,
            )}`}
            subtitle={`⏱️ Duration`}
          />
          <List.Item title={songStatus} subtitle={`🔈 Status`} />
          <List.Item title={releaseDate} subtitle={`📅 Release Date`} />
        </>
      ) : (
        <List.EmptyView
          title={"Not Playing"}
          description={"Try Playing Something First"}
          icon={Icon.Music}
        />
      )}
    </List>
  );
}
