import { Action, ActionPanel, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { DetailMetadata } from "./track-detail";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { refreshCache, wait } from "./util/cache";
import { Track } from "./util/models";
import json2md from "json2md";

export default function SetRating() {
  const [track, setTrack] = useState<Track | undefined>();
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getCurrentTrack = async () => {
      try {
        const track = await music.track.getCurrentTrackDetails();
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
        (track.inLibrary ? (
          Array.from({ length: 6 }, (_, i) => i).map((rating) => (
            <List.Item
              key={rating}
              title={`${rating} Star${rating === 1 ? "" : "s"}`}
              icon={{
                source: track.rating === rating ? "../assets/star-filled.svg" : "../assets/star.svg",
                tintColor: Color.PrimaryText,
              }}
              actions={
                <ActionPanel>
                  <Action
                    title="Set Rating"
                    icon={{ source: "../assets/star.svg", tintColor: Color.PrimaryText }}
                    onAction={async () => {
                      await pipe(
                        rating * 20,
                        music.player.setRating,
                        TE.map(() => setTrack({ ...track, rating })),
                        TE.mapLeft(() => showToast(Toast.Style.Failure, "Add Track to Library to Set Rating"))
                      )();
                    }}
                  />
                </ActionPanel>
              }
              detail={<List.Item.Detail markdown={markdown} metadata={<DetailMetadata track={track} list={true} />} />}
            />
          ))
        ) : (
          <List.Item
            title="Add to Library"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                {
                  <Action
                    title="Add to Library"
                    icon={Icon.Plus}
                    onAction={async () => {
                      await showToast(Toast.Style.Animated, "Adding to Library");
                      await handleTaskEitherError(music.player.addToLibrary)();
                      await wait(2);
                      setTrack({ ...track, inLibrary: true });
                      await showToast(Toast.Style.Success, "Added to Library");
                      await wait(3);
                      await refreshCache();
                    }}
                  />
                }
              </ActionPanel>
            }
            detail={<List.Item.Detail markdown={markdown} metadata={<DetailMetadata track={track} list={true} />} />}
          />
        ))}
    </List>
  );
}
