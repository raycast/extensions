import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import json2md from "json2md";
import { useEffect, useState } from "react";

import { DetailMetadata } from "./track-detail";
import { refreshCache, wait } from "./util/cache";
import { Track } from "./util/models";
import * as music from "./util/scripts";
import { Icons } from "./util/utils";

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
              icon={track.rating === rating ? Icons.StarFilled : Icons.Star}
              actions={
                <ActionPanel>
                  <Action
                    title="Set Rating"
                    icon={Icons.Star}
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
                      await pipe(
                        music.player.addToLibrary,
                        TE.map(async () => {
                          showToast(Toast.Style.Success, "Added to Library");
                          setTrack({ ...track, inLibrary: true });
                          await wait(5);
                          await refreshCache();
                        }),
                        TE.mapLeft(() => showToast(Toast.Style.Failure, "Failed to Add to Library"))
                      )();
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
