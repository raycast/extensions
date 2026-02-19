import { getPreferenceValues, Icon, Keyboard, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pipe } from "fp-ts/lib/function";
import * as music from "./util/scripts";
import * as TE from "fp-ts/TaskEither";
import { handleTaskEitherError } from "./util/utils";
import { PlayerState } from "./util/models";
import { getPlayerState } from "./util/scripts/player-controls";
import { useRef } from "react";
import { formatTitle } from "./util/track";

const { hideArtistName, maxTextLength, cleanupTitle, hideIconWhenIdle } =
  getPreferenceValues<Preferences.CurrentlyPlayingMenuBar>();

type FavoriteStatus = {
  trackId: string;
  isFavorited: boolean;
};

export default function CurrentlyPlayingMenuBarCommand() {
  const shouldExecute = useRef<boolean>(false);

  const { isLoading: isLoadingCurrentTrack, data: currentTrack } = usePromise(
    () =>
      pipe(
        music.currentTrack.getCurrentTrack(),
        TE.matchW(
          () => undefined,
          (track) => track,
        ),
      )(),
    [],
    {
      onData() {
        shouldExecute.current = true;
      },
    },
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
    { execute: shouldExecute.current },
  );
  const {
    isLoading: isLoadingFavoriteStatus,
    data: favoriteStatus,
    mutate: mutateFavoriteStatus,
  } = usePromise(
    (trackId?: string) => {
      if (!trackId) {
        return Promise.resolve<FavoriteStatus | undefined>(undefined);
      }

      return pipe(
        music.currentTrack.getFavoriteForCurrentTrackId(trackId),
        TE.matchW(
          () => undefined,
          (favoriteStatus) => {
            if (favoriteStatus === undefined) {
              return undefined;
            }

            return {
              trackId,
              isFavorited: favoriteStatus.trim().toLowerCase() === "true",
            };
          },
        ),
      )();
    },
    [currentTrack?.id],
    { execute: !!currentTrack },
  );

  const isRunning = !isLoadingCurrentTrack && !!currentTrack;
  const isPlaying = playerState === PlayerState.PLAYING;
  const isFavoriteStatusForCurrentTrack = favoriteStatus?.trackId === currentTrack?.id;
  const isFavorited = isFavoriteStatusForCurrentTrack && favoriteStatus?.isFavorited === true;
  const isLoading = isLoadingCurrentTrack || isLoadingPlayerState || isLoadingFavoriteStatus;

  if (!isRunning) {
    return <NothingPlaying title="Music needs to be opened" isLoading={isLoading} />;
  }

  if (!currentTrack) {
    return <NothingPlaying isLoading={isLoading} />;
  }

  const title = formatTitle({
    name: currentTrack.name,
    artistName: currentTrack.artist,
    hideArtistName,
    maxTextLength,
    cleanupTitle,
  });

  return (
    <MenuBarExtra isLoading={isLoading} icon="icon.png" title={title} tooltip={title}>
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
          const actionTrackId = currentTrack.id;
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
                mutateFavoriteStatus(undefined, {
                  optimisticUpdate(data) {
                    if (!data || data.trackId !== actionTrackId) {
                      return data;
                    }

                    return { trackId: actionTrackId, isFavorited: nextFavoriteState };
                  },
                }),
            ),
          )();
        }}
      />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon="icon.png"
          title="Open Music"
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open("music://")}
        />
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
