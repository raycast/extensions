import { List, Toast, showToast, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getTrackDetails, getArtwork } from "./util/scripts/track";
import { Track } from "./util/models";
import json2md from "json2md";

const getAttribute = (data: string, key: string) => {
  return data.split(`${key}=`)[1].split("&")[0].replace("\n", "");
};

export const TrackDetail = (props: { id: string }) => {
  const [track, setTrack] = useState<Track | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);

  useEffect(() => {
    const getTrack = async () => {
      try {
        const data = (await getTrackDetails(props.id)).replace(" & ", " and ");
        const track: Track = {
          id: props.id,
          name: getAttribute(data, "name"),
          artist: getAttribute(data, "artist"),
          album: getAttribute(data, "album"),
          duration: getAttribute(data, "duration"),
          genre: getAttribute(data, "genre"),
          time: getAttribute(data, "time"),
          playCount: parseInt(getAttribute(data, "playCount")),
          loved: getAttribute(data, "loved") === "true",
          year: getAttribute(data, "year"),
        };
        setTrack(track);
        const artwork = await getArtwork(props.id);
        const md = json2md([{ h1: track?.name }, { img: [{ title: "Artwork", source: artwork }] }]);
        setMarkdown(md);
      } catch {
        showToast(Toast.Style.Failure, "Could not get track details or artwork");
      }
    };
    getTrack();
  }, []);

  return (
    <List.Item.Detail
      isLoading={markdown === null}
      markdown={markdown && markdown}
      metadata={
        markdown &&
        track && (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Loved"
              icon={{
                source: track.loved ? "../assets/loved.png" : "../assets/not-loved.png",
                tintColor: track.loved ? Color.Red : Color.PrimaryText,
              }}
            />
            <List.Item.Detail.Metadata.Label title="Album" text={track.album} />
            <List.Item.Detail.Metadata.Label title="Artist" text={track.artist} />
            <List.Item.Detail.Metadata.Label title="Genre" text={track.genre} />
            <List.Item.Detail.Metadata.Label title="Duration" text={track.time} />
            <List.Item.Detail.Metadata.Label title="Year" text={track.year} />
            <List.Item.Detail.Metadata.Label
              title="Play Count"
              text={track.playCount ? track.playCount.toString() : "0"}
            />
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
};
