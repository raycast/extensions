import { List, Toast, showToast, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getTrackDetails } from "./util/scripts/track";
import { Track } from "./util/models";
import json2md from "json2md";
import { getTrackArtwork } from "./util/artwork";

export const TrackDetail = (props: { track: Track }) => {
  const [track, setTrack] = useState<Track | undefined>(undefined);
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getTrack = async () => {
      try {
        const track = await getTrackDetails(props.track);
        const artwork = await getTrackArtwork(track);
        setTrack({ ...track, artwork });
        let items = [];
        items.push({ h1: track.name });
        if (track.artwork && track.artwork !== "../assets/no-track.png") {
          items.push({
            img: { source: track.artwork.replace("300x300", "174s") },
          });
        }
        setMarkdown(json2md(items));
      } catch {
        showToast(Toast.Style.Failure, "Could not get track details or artwork");
      }
    };
    getTrack();
  }, []);

  return (
    <List.Item.Detail
      isLoading={markdown === undefined}
      markdown={markdown && markdown}
      metadata={
        markdown &&
        track && (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Loved"
              icon={{
                source: track.loved ? "../assets/heart-filled.svg" : "../assets/heart.svg",
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
