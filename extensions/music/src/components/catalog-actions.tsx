import { Action, Alert, closeMainWindow, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";

import { addToLibrary, isInLibrary } from "../util/catalog-api";
import { hud } from "../util/feedback";
import { isNotInLibraryError } from "../util/apple-script";
import { CatalogAlbum, CatalogPlaylist, CatalogSong } from "../util/models";
import * as music from "../util/scripts";

const ADD_TITLES = {
  songs: "Add Song to Library",
  albums: "Add Album to Library",
  playlists: "Add Playlist to Library",
} as const;

/** Add a catalog item to the library, checking membership at action time and
 * asking before re-adding an item that is already there. Playlists get no
 * duplicate check — the `include=library` linkage only exists for albums and
 * songs. */
export function AddToLibraryAction({
  kind,
  id,
  title,
  onAdded,
}: {
  kind: keyof typeof ADD_TITLES;
  id: string;
  title: string;
  onAdded?: () => void;
}) {
  return (
    <Action
      title={ADD_TITLES[kind]}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      onAction={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Adding to Library…" });

        const alreadyInLibrary =
          kind === "playlists"
            ? false
            : await pipe(
                isInLibrary(kind, id),
                // A failed check must not block the add — worst case the user
                // misses a duplicate warning, not the add itself.
                TE.getOrElse(() => T.of(false)),
              )();

        if (alreadyInLibrary) {
          // An animated toast never resolves on its own — hide it before the
          // alert so a Cancel doesn't leave it spinning forever.
          await toast.hide();
          const confirmed = await confirmAlert({
            title: "Already in Library",
            message: `"${title}" is already in your library. Add it anyway?`,
            icon: Icon.QuestionMark,
            primaryAction: { title: "Add Anyway", style: Alert.ActionStyle.Default },
          });
          if (!confirmed) return;
          await showToast({ style: Toast.Style.Animated, title: "Adding to Library…" });
        }

        await pipe(
          addToLibrary(kind, id),
          TE.match(
            (error) => {
              showToast({ style: Toast.Style.Failure, title: "Add to Library Failed", message: error.message });
            },
            () => {
              onAdded?.();
              // 202 means Apple accepted the add, not that it has landed — it
              // arrives via cloud sync, so the copy promises "shortly".
              showToast({
                style: Toast.Style.Success,
                title: `Added "${title}"`,
                message: "It will appear in your library shortly.",
              });
            },
          ),
        )();
      }}
    />
  );
}

export function OpenInMusicAction({ url }: { url: string | null }) {
  if (!url) return null;
  // The music: scheme hands the page to Music.app; the https URL would open
  // the web player in the browser instead.
  return <Action.Open title="Open in Music" icon={Icon.Music} target={url.replace(/^https:/, "music:")} />;
}

/** Run one of the library play scripts, closing Raycast on success. A local
 * miss gets its own copy: the In Library badge reflects the cloud library,
 * but playback goes through Music.app, which syncs that down on its own
 * schedule — so a freshly added item can be badged yet not playable for a
 * while. */
async function playFromLibrary(
  kind: "Album" | "Song" | "Playlist",
  title: string,
  play: TE.TaskEither<Error, unknown>,
) {
  await pipe(
    play,
    TE.match(
      async (error) => {
        if (isNotInLibraryError(error)) {
          await showToast({
            style: Toast.Style.Failure,
            title: `${kind} Not Currently Available in Local Library`,
            message: `Music.app has not synced "${title}" yet. Try again in a moment, or open it in Music.`,
          });
          return;
        }
        await showToast({ style: Toast.Style.Failure, title: `Could Not Play "${title}"`, message: error.message });
      },
      async () => {
        await closeMainWindow();
        await hud(`Playing "${title}"`);
      },
    ),
  )();
}

/** Play a catalog song's library copy. Only offer this for songs the
 * membership check has confirmed — there is nothing to play otherwise. */
export function PlayLibrarySongAction({ song }: { song: CatalogSong }) {
  return (
    <Action
      title="Play from Library"
      icon={Icon.Play}
      onAction={() =>
        playFromLibrary(
          "Song",
          song.title,
          music.track.playMatching({ title: song.title, artist: song.artist, album: song.album }),
        )
      }
    />
  );
}

/** Play (or shuffle) a catalog album's library copy — same precondition as
 * the song action. */
export function PlayLibraryAlbumAction({ album, shuffle = false }: { album: CatalogAlbum; shuffle?: boolean }) {
  return (
    <Action
      title={shuffle ? "Shuffle Album from Library" : "Play Album from Library"}
      icon={shuffle ? Icon.Shuffle : Icon.Play}
      onAction={() =>
        playFromLibrary(
          "Album",
          album.title,
          music.albums.playMatching(shuffle)({ title: album.title, artist: album.artist }),
        )
      }
    />
  );
}

/** Play a recommended playlist's copy in Music.app. `own` says whether it is
 * one of the user's own playlists (per the API's library links) rather than
 * an Apple Music playlist they added — the two live in different classes in
 * Music.app, so the lookup can't pick the wrong one. */
export function PlayLibraryPlaylistAction({
  playlist,
  own,
  shuffle = false,
}: {
  playlist: CatalogPlaylist;
  own: boolean;
  shuffle?: boolean;
}) {
  return (
    <Action
      title={shuffle ? "Shuffle Playlist from Library" : "Play Playlist from Library"}
      icon={shuffle ? Icon.Shuffle : Icon.Play}
      onAction={() =>
        playFromLibrary(
          "Playlist",
          playlist.title,
          music.playlists.playMatching(shuffle)({ name: playlist.title, own }),
        )
      }
    />
  );
}
