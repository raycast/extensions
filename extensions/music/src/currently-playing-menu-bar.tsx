import { getPreferenceValues, Icon, Keyboard, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";

import * as music from "./util/scripts";
import { PlayerState } from "./util/models";
import { formatTitle } from "./util/track";
import { handleTaskEitherError } from "./util/utils";

const { hideArtistName, maxTextLength, cleanupTitle, hideIconWhenIdle } =
  getPreferenceValues<Preferences.CurrentlyPlayingMenuBar>();

function toMutationPromise<E extends Error, T>(taskEither: TE.TaskEither<E, T>, error: string, success: string) {
  const handledTask = pipe(
    taskEither,
    handleTaskEitherError(error, success),
    TE.getOrElseW((handledError) => async () => {
      throw handledError;
    }),
  );

  return Promise.resolve().then(() => handledTask());
}

export default function CurrentlyPlayingMenuBarCommand() {
  const {
    isLoading,
    data: snapshot,
    mutate,
  } = useCachedPromise(
    () =>
      pipe(
        music.currentTrack.getMenuBarSnapshot(),
        TE.matchW(
          () => ({ kind: "not-running" }) as const,
          (value) => value,
        ),
      )(),
    [],
    { keepPreviousData: true },
  );

  const currentTrack = snapshot?.kind === "ok" ? snapshot.track : undefined;
  const playerState = snapshot?.kind === "ok" ? snapshot.playerState : undefined;
  const isPlaying = playerState === PlayerState.PLAYING;
  const isFavorited = currentTrack?.favorited === "true";

  const title = currentTrack
    ? formatTitle({
        name: currentTrack.name,
        artistName: currentTrack.artist,
        hideArtistName,
        maxTextLength,
        cleanupTitle,
      })
    : "";

  const DROPDOWN_MAX = 40;
  const fullTitle = currentTrack
    ? formatTitle({
        name: currentTrack.name,
        artistName: currentTrack.artist,
        hideArtistName,
        maxTextLength: "999",
        cleanupTitle,
      })
    : "";
  const needsScroll = fullTitle.length > DROPDOWN_MAX;
  const SEPARATOR = "   ·   ";
  const paddedTitle = needsScroll ? fullTitle + SEPARATOR : fullTitle;

  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    setScrollOffset(0);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!needsScroll) return;

    const interval = setInterval(() => {
      setScrollOffset((prev) => (prev + 1) % paddedTitle.length);
    }, 200);

    return () => clearInterval(interval);
  }, [needsScroll, paddedTitle.length]);

  const dropdownTitle = needsScroll
    ? (paddedTitle + paddedTitle).substring(scrollOffset, scrollOffset + DROPDOWN_MAX)
    : fullTitle;

  if (!snapshot || snapshot.kind === "not-running") {
    return <NothingPlaying title="Music needs to be opened" isLoading={isLoading} />;
  }

  if (snapshot.kind === "no-track" || !currentTrack) {
    return <NothingPlaying isLoading={isLoading} />;
  }

  return (
    <MenuBarExtra isLoading={isLoading} icon="icon.png" title={title}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon="icon.png"
          title={dropdownTitle}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open("music://")}
        />
      </MenuBarExtra.Section>
      {isPlaying && (
        <MenuBarExtra.Item
          icon={Icon.Pause}
          title="Pause"
          onAction={() =>
            mutate(toMutationPromise(music.player.pause, "Failed to pause playback", "Playback paused"), {
              optimisticUpdate(data) {
                if (!data || data.kind !== "ok") return data;

                return { ...data, playerState: PlayerState.PAUSED };
              },
            })
          }
        />
      )}
      {!isPlaying && (
        <MenuBarExtra.Item
          icon={Icon.Play}
          title="Play"
          onAction={() =>
            mutate(toMutationPromise(music.player.play, "Failed to start playback", "Playback started"), {
              optimisticUpdate(data) {
                if (!data || data.kind !== "ok") return data;

                return { ...data, playerState: PlayerState.PLAYING };
              },
            })
          }
        />
      )}
      <MenuBarExtra.Item
        icon={Icon.Forward}
        title="Next"
        onAction={() => mutate(toMutationPromise(music.player.next, "Failed to skip track", "Track skipped"))}
      />
      <MenuBarExtra.Item
        icon={Icon.Rewind}
        title="Previous"
        onAction={() => mutate(toMutationPromise(music.player.previous, "Failed to rewind track", "Track rewinded"))}
      />
      <MenuBarExtra.Item
        icon={isFavorited ? Icon.StarDisabled : Icon.Star}
        title={isFavorited ? "Unfavorite Track" : "Favorite Track"}
        onAction={() => {
          const nextFavoriteState = !isFavorited;
          const toggleFavoriteAction = nextFavoriteState ? music.currentTrack.favorite : music.currentTrack.unfavorite;

          return mutate(
            toMutationPromise(
              toggleFavoriteAction,
              nextFavoriteState ? "Failed to favorite the track" : "Failed to unfavorite the track",
              nextFavoriteState ? "Favorited" : "Unfavorited",
            ),
            {
              optimisticUpdate(data) {
                if (!data || data.kind !== "ok") return data;

                return {
                  ...data,
                  track: { ...data.track, favorited: nextFavoriteState ? "true" : "false" },
                };
              },
            },
          );
        }}
      />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ macOS: { modifiers: ["cmd"], key: "," }, Windows: { modifiers: ["ctrl"], key: "," } }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function NothingPlaying({ title = "Nothing is playing right now", isLoading }: { title?: string; isLoading: boolean }) {
  return hideIconWhenIdle ? null : (
    <MenuBarExtra icon="icon.png" isLoading={isLoading}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={title} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Music" icon="icon.png" onAction={() => open("music://")} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ macOS: { modifiers: ["cmd"], key: "," }, Windows: { modifiers: ["ctrl"], key: "," } }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
