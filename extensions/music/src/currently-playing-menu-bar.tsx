import { getPreferenceValues, Icon, Keyboard, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pipe } from "fp-ts/lib/function";
import * as music from "./util/scripts";
import * as TE from "fp-ts/TaskEither";
import { handleTaskEitherError } from "./util/utils";
import { PlayerState } from "./util/models";
import { getPlayerState } from "./util/scripts/player-controls";
import { useEffect, useState } from "react";
import { formatTitle } from "./util/track";

const { hideArtistName, maxTextLength, cleanupTitle, hideIconWhenIdle } =
  getPreferenceValues<Preferences.CurrentlyPlayingMenuBar>();

export default function CurrentlyPlayingMenuBarCommand() {
  const {
    isLoading: isLoadingCurrentTrack,
    data: currentTrack,
    mutate: mutateCurrentTrack,
  } = usePromise(
    () =>
      pipe(
        music.currentTrack.getCurrentTrack(),
        TE.matchW(
          () => undefined,
          (track) => track,
        ),
      )(),
    [],
  );
  const {
    isLoading: isLoadingPlayerState,
    data: playerState,
    mutate: mutatePlayerState,
  } = usePromise(
    () =>
      pipe(
        getPlayerState,
        TE.matchW(
          () => PlayerState.STOPPED,
          (state) => state,
        ),
      )(),
    [],
  );

  const isRunning = !isLoadingCurrentTrack && !!currentTrack;
  const isLoading = isLoadingCurrentTrack || isLoadingPlayerState;

  // Default to playing/not-favorited while data loads to avoid flicker on open
  const isPlaying = playerState !== undefined ? playerState === PlayerState.PLAYING : true;
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

  if (!isRunning) {
    return <NothingPlaying title="Music needs to be opened" isLoading={isLoading} />;
  }

  if (!currentTrack) {
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
            pipe(
              music.player.pause,
              handleTaskEitherError("Failed to pause playback", "Playback paused"),
              TE.chainFirstTaskK(
                () => () =>
                  mutatePlayerState(undefined, {
                    optimisticUpdate() {
                      return PlayerState.PAUSED;
                    },
                  }),
              ),
            )()
          }
        />
      )}
      {!isPlaying && (
        <MenuBarExtra.Item
          icon={Icon.Play}
          title="Play"
          onAction={() =>
            pipe(
              music.player.play,
              handleTaskEitherError("Failed to start playback", "Playback started"),
              TE.chainFirstTaskK(
                () => () =>
                  mutatePlayerState(undefined, {
                    optimisticUpdate() {
                      return PlayerState.PLAYING;
                    },
                  }),
              ),
            )()
          }
        />
      )}
      <MenuBarExtra.Item
        icon={Icon.Forward}
        title="Next"
        onAction={() => pipe(music.player.next, handleTaskEitherError("Failed to skip track", "Track skipped"))()}
      />
      <MenuBarExtra.Item
        icon={Icon.Rewind}
        title="Previous"
        onAction={() =>
          pipe(music.player.previous, handleTaskEitherError("Failed to rewind track", "Track rewinded"))()
        }
      />
      <MenuBarExtra.Item
        icon={isFavorited ? Icon.StarDisabled : Icon.Star}
        title={isFavorited ? "Unfavorite Track" : "Favorite Track"}
        onAction={() => {
          const nextFavoriteState = !isFavorited;
          const toggleFavoriteAction = nextFavoriteState ? music.currentTrack.favorite : music.currentTrack.unfavorite;

          return pipe(
            toggleFavoriteAction,
            handleTaskEitherError(
              nextFavoriteState ? "Failed to favorite the track" : "Failed to unfavorite the track",
              nextFavoriteState ? "Favorited" : "Unfavorited",
            ),
            TE.chainFirstTaskK(
              () => () =>
                mutateCurrentTrack(undefined, {
                  optimisticUpdate(data) {
                    if (!data) return data;
                    return { ...data, favorited: nextFavoriteState ? "true" : "false" };
                  },
                }),
            ),
          )();
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
