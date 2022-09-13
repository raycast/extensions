import { List, Detail, Action, ActionPanel, Icon, Toast, showToast, showHUD } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import json2md from "json2md";
import { useEffect, useState } from "react";

import PlayAlbum from "./play-album";
import PlayPlaylist from "./play-playlist";
import PlayTrack from "./play-track";
import { DetailMetadata } from "./track-detail";
import { refreshCache, wait } from "./util/cache";
import { Track } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError, Icons } from "./util/utils";

export default function CurrentTrack() {
  const [track, setTrack] = useState<Track | undefined>(undefined);
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);
  const [playing, setPlaying] = useState<boolean | undefined>(undefined);
  const [noTrack, setNoTrack] = useState<boolean>(false);

  useEffect(() => {
    const getTrack = async () => {
      try {
        setPlaying(await music.player.isPlaying());
        const track = await music.track.getCurrentTrackDetails();
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
        setNoTrack(true);
      }
    };
    getTrack();
    return () => {
      setTrack(undefined);
      setMarkdown(undefined);
    };
  }, []);

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
      isLoading={markdown === undefined}
      markdown={markdown}
      metadata={markdown && track && <DetailMetadata track={track} />}
      actions={
        track && (
          <ActionPanel>
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
          </ActionPanel>
        )
      }
    />
  );
}
