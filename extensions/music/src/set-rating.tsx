import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { DetailMetadata } from "./track-detail";
import { getCurrentTrackDetails } from "./util/scripts/track";
import { handleTaskEitherError } from "./util/utils";
import * as music from "./util/scripts";
import { Track } from "./util/models";
import json2md from "json2md";

export default function SetRating() {
  const [track, setTrack] = useState<Track | undefined>();
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getCurrentTrack = async () => {
      try {
        const track = await getCurrentTrackDetails();
        setTrack(track);
        const items = [];
        items.push({ h1: track.name });
        if (track.artwork && track.artwork !== "../assets/no-track.png") {
          items.push({
            img: { source: track.artwork.replace("300x300", "174s") },
          });
        }
        setMarkdown(json2md(items));
      } catch {
        showToast(Toast.Style.Failure, "No Track Playing");
      }
    };
    getCurrentTrack();
    return () => {
      setTrack(undefined);
      setMarkdown(undefined);
    };
  }, []);

  return (
    <List isLoading={markdown === undefined} isShowingDetail={true}>
      {track &&
        markdown &&
        Array.from({ length: 6 }, (_, i) => i).map((rating) => (
          <List.Item
            key={rating}
            title={`${rating} Star${rating === 1 ? "" : "s"}`}
            icon={track.rating === rating ? "../assets/star-filled.svg" : "../assets/star.svg"}
            actions={
              <ActionPanel>
                <Action
                  title="Set Rating"
                  icon={"../assets/star.svg"}
                  onAction={async () => {
                    await handleTaskEitherError(music.player.setRating(rating * 20))();
                    setTrack({ ...track, rating });
                  }}
                />
              </ActionPanel>
            }
            detail={
              track ? (
                <List.Item.Detail markdown={markdown} metadata={<DetailMetadata track={track} list={true} />} />
              ) : undefined
            }
          />
        ))}
    </List>
  );
}
