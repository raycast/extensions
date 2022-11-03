import { List, Detail, Action, ActionPanel, Icon, Toast, showToast, showHUD, Color } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import json2md from "json2md";
import React, { useEffect, useState } from "react";

import PlayAlbum from "./play-album";
import PlayPlaylist from "./play-playlist";
import PlayTrack from "./play-track";
import { DetailMetadata } from "./track-detail";
import { refreshCache, wait } from "./util/cache";
import { Track } from "./util/models";
import { Icons } from "./util/presets";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default function CurrentTrack() {
  const [track, setTrack] = useState<Track | undefined>(undefined);
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);
  const [playing, setPlaying] = useState<boolean | undefined>(undefined);
  const [noTrack, setNoTrack] = useState<boolean>(false);

  const getTrack = async () => {
    try {
      setLoading(true);
      setPlaying(await music.player.isPlaying());
      const track = await music.track.getCurrentTrackDetails();
      setTrack(track);
      const items: json2md.DataObject[] = [{ h1: track.name }];
      if (track.artwork && track.artwork !== "../assets/no-track.png") {
        items.push({
          img: { title: track.name, source: track.artwork.replace("300x300", "600x600") },
        });
      }
      setMarkdown(json2md(items));
      setLoading(false);
    } catch {
      setNoTrack(true);
    }
  };

  const [loading, setLoading] = useState<boolean>(true);
  const [refresh, setRefresh] = useState<boolean>(false);

  useEffect(() => {
    getTrack();
    return () => {
      setTrack(undefined);
      setMarkdown(undefined);
    };
  }, [refresh]);

  return noTrack ? (
    <List
      actions={
        <ActionPanel>
          <Action.Push title="Play Track" icon={Icon.Play} target={<PlayTrack />} />
          <Action.Push title="Play Album" icon={Icons.Album} target={<PlayAlbum />} />
          <Action.Push
            title="Play Playlist"
            icon={Icons.Playlist}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            target={<PlayPlaylist />}
          />
          <Action
            title="Show Apple Music"
            icon={Icons.Music}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => {
              await handleTaskEitherError(music.player.activate)();
            }}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="No Track Playing"
        icon={"../assets/not-playing.svg"}
        description={"Use Raycast or Apple Music to Start a Track"}
      />
    </List>
  ) : (
    <Detail
      navigationTitle={track?.name}
      isLoading={loading}
      markdown={markdown}
      metadata={markdown && track && <DetailMetadata track={track} />}
      actions={
        track && (
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title={playing ? "Pause" : "Play"}
                icon={playing ? Icon.Pause : Icon.Play}
                onAction={async () => {
                  await handleTaskEitherError(music.player.togglePlay)();
                  setPlaying(!playing);
                }}
              />
              <Action
                title="Show Track"
                icon={Icons.Music}
                onAction={async () => {
                  await handleTaskEitherError(music.player.revealTrack)();
                  await handleTaskEitherError(music.player.activate)();
                }}
              />
              <Action
                title="Next Track"
                icon={Icon.Forward}
                shortcut={{ modifiers: [], key: "arrowRight" }}
                onAction={async () => {
                  await handleTaskEitherError(music.player.next)();
                  setRefresh(!refresh);
                }}
              />
              <Action
                title="Previous Track"
                icon={Icon.Rewind}
                shortcut={{ modifiers: [], key: "arrowLeft" }}
                onAction={async () => {
                  await handleTaskEitherError(music.player.previous)();
                  setRefresh(!refresh);
                }}
              />
              <Action
                title="Restart Track"
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                icon={Icon.ArrowCounterClockwise}
                onAction={async () => {
                  await handleTaskEitherError(music.player.restart)();
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title={track?.name}>
              {!track.inLibrary && (
                <Action
                  title="Add to Library"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
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
              )}
              <Action
                title={`${track.loved ? "Unlove" : "Love"} Track`}
                icon={Icon.Heart}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
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
              {track.inLibrary && (
                <React.Fragment>
                  <ActionPanel.Submenu title="Set Rating" icon={Icon.Star} shortcut={{ modifiers: ["cmd"], key: "r" }}>
                    {Array.from({ length: 6 }, (_, i) => i).map((rating) => (
                      <Action
                        key={rating}
                        title={`${rating} Star${rating === 1 ? "" : "s"}`}
                        icon={track.rating === rating ? Icons.StarFilled : Icons.Star}
                        onAction={async () => {
                          await pipe(
                            rating * 20,
                            music.player.setRating,
                            TE.map(() => setTrack({ ...track, rating: rating })),
                            TE.mapLeft(() => showHUD("Add Track to Library to Set Rating"))
                          )();
                        }}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <Action
                    title="Delete from Library"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      await pipe(
                        music.player.deleteFromLibrary,
                        TE.map(async () => {
                          showHUD("Deleted from Library");
                          await wait(5);
                          await refreshCache();
                        }),
                        TE.mapLeft(() => showHUD("Failed to Delete from Library"))
                      )();
                    }}
                  />
                </React.Fragment>
              )}
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}
