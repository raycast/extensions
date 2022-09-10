import { Detail, showToast, Toast, Action, ActionPanel, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { handleTaskEitherError, MusicIcon } from "./util/utils";
import { getCurrentTrackDetails } from "./util/scripts/track";
import { DetailMetadata } from "./track-detail";
import * as music from "./util/scripts";
import { Track } from "./util/models";
import json2md from "json2md";
import SetRating from "./set-rating";
import { pipe } from "fp-ts/lib/function";

export default function CurrentTrack() {
  const [track, setTrack] = useState<Track | undefined>(undefined);
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getTrack = async () => {
      try {
        const track = await getCurrentTrackDetails();
        setTrack(track);
        const items = [];
        items.push({ h1: track.name });
        if (track.artwork && track.artwork !== "../assets/no-track.png") {
          items.push({
            img: { source: track.artwork.replace("300x300", "600x600") },
          });
        }
        setMarkdown(json2md(items));
      } catch {
        showToast(Toast.Style.Failure, "No Track Playing");
      }
    };
    getTrack();
    return () => {
      setTrack(undefined);
      setMarkdown(undefined);
    };
  }, []);

  return (
    <Detail
      isLoading={markdown === undefined}
      markdown={markdown}
      metadata={markdown && track && <DetailMetadata track={track} />}
      actions={
        track && (
          <ActionPanel>
            <Action
              title="Show Track"
              icon={MusicIcon}
              onAction={async () => {
                await handleTaskEitherError(music.player.revealTrack)();
                await handleTaskEitherError(music.player.activate)();
              }}
            />
            <Action
              title={`${track.loved ? "Unlove" : "Love"} Track`}
              icon={Icon.Heart}
              onAction={async () => {
                await handleTaskEitherError(music.player.toggleLove)();
                setTrack({ ...track, loved: !track.loved });
              }}
            />
            <Action
              title="Dislike Track"
              icon={Icon.HeartDisabled}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                await handleTaskEitherError(music.player.dislike)();
                await handleTaskEitherError(music.player.setRating(0))();
                setTrack({ ...track, rating: 0 });
              }}
            />
            <ActionPanel.Submenu title="Set Rating" icon={Icon.Star} shortcut={{ modifiers: ["cmd"], key: "r" }}>
              {Array.from({ length: 6 }, (_, i) => i).map((rating) => (
                <Action
                  key={rating}
                  title={`${rating} Star${rating === 1 ? "" : "s"}`}
                  icon={track.rating === rating ? "../assets/star-filled.svg" : "../assets/star.svg"}
                  onAction={async () => {
                    await handleTaskEitherError(music.player.setRating(rating * 20))();
                    setTrack({ ...track, rating });
                  }}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel>
        )
      }
    />
  );
}
