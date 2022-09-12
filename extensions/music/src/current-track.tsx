import { List, Detail, Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { handleTaskEitherError, MusicIcon } from "./util/utils";
import { DetailMetadata } from "./track-detail";
import PlayTrack from "./play-track";
import PlayAlbum from "./play-album";
import PlayPlaylist from "./play-playlist";
import { Track } from "./util/models";
import * as music from "./util/scripts";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import json2md from "json2md";

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
          <Action.Push title="Play Track" icon={Icon.Music} target={<PlayTrack />} />
          <Action.Push title="Play Album" icon={Icon.Music} target={<PlayAlbum />} />
          <Action.Push
            title="Play Playlist"
            icon={Icon.Music}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            target={<PlayPlaylist />}
          />
          <Action
            title="Show Apple Music"
            icon={MusicIcon}
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
              icon={MusicIcon}
              onAction={async () => {
                await handleTaskEitherError(music.player.revealTrack)();
                await handleTaskEitherError(music.player.activate)();
              }}
            />
            {!track.inLibrary && (
              <Action
                title="Add to Library"
                icon={Icon.Plus}
                onAction={async () => {
                  await handleTaskEitherError(music.player.addToLibrary)();
                  setTrack({ ...track, inLibrary: true });
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
                  icon={track.rating === rating ? "../assets/star-filled.svg" : "../assets/star.svg"}
                  onAction={async () => {
                    await pipe(
                      rating * 20,
                      music.player.setRating,
                      TE.map(() => setTrack({ ...track, rating: rating })),
                      TE.mapLeft(() => showHUD("Unable to Set Rating"))
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
