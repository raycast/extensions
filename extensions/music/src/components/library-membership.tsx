import { Color, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";

import { getLibraryMembership } from "../util/catalog-api";
import { getLocalPlaylists, LocalPlaylist } from "../util/scripts/playlists";

// Polling only runs while an add is pending, against a batched request per
// kind — gentle enough for Apple, fast enough that the badge flips within a
// few seconds of the add landing via cloud sync.
const PENDING_POLL_MS = 5000;

const EMPTY_SET: ReadonlySet<string> = new Set();
const EMPTY_MAP: ReadonlyMap<string, LocalPlaylistMatch> = new Map();
const NO_PLAYLISTS: readonly LocalPlaylist[] = [];

export interface PlaylistRef {
  id: string;
  title: string;
}

/** Music.app playlists sharing a recommended playlist's name, by kind. */
export interface LocalPlaylistMatch {
  /** The Apple Music ("subscription") playlist — i.e. the recommended one,
   * added to the library. */
  subscriptionId?: string;
  /** The user's own playlist of the same name — a looser, name-only match. */
  userId?: string;
}

const fetchMembership = (kind: "albums" | "songs", ids: string[]) =>
  pipe(
    getLibraryMembership(kind, ids),
    // Badges are decoration — on failure they simply don't render, rather
    // than surfacing an error for something the user didn't ask for.
    TE.getOrElse(() => T.of(new Set<string>())),
  )();

const fetchLocalPlaylists = () =>
  pipe(
    getLocalPlaylists(),
    TE.getOrElse(() => T.of(NO_PLAYLISTS)),
  )();

// AppleScript's string comparison is case-insensitive, so match the same way
// the play scripts would.
const normalizeName = (name: string) => name.trim().toLowerCase();

function matchPlaylists(refs: PlaylistRef[], local: readonly LocalPlaylist[]) {
  const byName = new Map<string, LocalPlaylistMatch>();
  for (const playlist of local) {
    const key = normalizeName(playlist.name);
    const entry = byName.get(key) ?? {};
    if (playlist.kind === "subscription playlist") entry.subscriptionId ??= playlist.id;
    else entry.userId ??= playlist.id;
    byName.set(key, entry);
  }
  const matches = new Map<string, LocalPlaylistMatch>();
  for (const ref of refs) {
    const match = byName.get(normalizeName(ref.title));
    if (match) matches.set(ref.id, match);
  }
  return matches;
}

/** Library-membership state for a set of catalog items: which are already in
 * the library, plus a session "Adding…" set for items whose add was accepted
 * (202) but hasn't landed via cloud sync yet. While anything is pending,
 * membership is re-checked every few seconds so the badge flips to In
 * Library on arrival.
 *
 * Albums and songs use Apple's own linkage (the batched `include=library`
 * check). Playlists have no such linkage, so they're matched by name against
 * Music.app's own playlist index instead — which is also the only answer
 * playback cares about, since it goes through Music.app. A match on an Apple
 * Music playlist counts as In Library; a match on one of the user's own
 * playlists is reported separately via `playlistMatches`.
 *
 * Pass referentially stable arrays (memoize derived ones) — a new array
 * identity per render would refetch every render. */
export function useLibraryMembership(albumIds: string[], songIds: string[], playlists: PlaylistRef[] = []) {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  const { data, revalidate } = usePromise(
    async (albums: string[], songs: string[], refs: PlaylistRef[]) => {
      const [albumMatches, songMatches, local] = await Promise.all([
        fetchMembership("albums", albums),
        fetchMembership("songs", songs),
        refs.length > 0 ? fetchLocalPlaylists() : Promise.resolve(NO_PLAYLISTS),
      ]);
      const playlistMatches = matchPlaylists(refs, local);
      const inLibrary = new Set([...albumMatches, ...songMatches]);
      for (const [id, match] of playlistMatches) {
        if (match.subscriptionId) inLibrary.add(id);
      }
      return { inLibrary, playlistMatches };
    },
    [albumIds, songIds, playlists],
    { execute: albumIds.length + songIds.length + playlists.length > 0 },
  );
  const inLibrary = data?.inLibrary;

  useEffect(() => {
    if (pendingIds.size === 0) return;
    const interval = setInterval(revalidate, PENDING_POLL_MS);
    return () => clearInterval(interval);
  }, [pendingIds.size, revalidate]);

  // A pending add that now shows up in the library has landed.
  useEffect(() => {
    if (!inLibrary) return;
    setPendingIds((prev) => {
      const next = new Set([...prev].filter((id) => !inLibrary.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [inLibrary]);

  const markPending = (id: string) => setPendingIds((prev) => new Set([...prev, id]));
  return {
    inLibrary: inLibrary ?? EMPTY_SET,
    playlistMatches: data?.playlistMatches ?? EMPTY_MAP,
    pendingIds,
    markPending,
  };
}

export type LibraryMembership = ReturnType<typeof useLibraryMembership>;

/** Grid tiles only fit a single corner icon, so membership renders as an
 * icon + tooltip instead of a list tag. */
export function membershipGridAccessory(id: string, membership: LibraryMembership): Grid.Item.Accessory | undefined {
  if (membership.inLibrary.has(id)) {
    return { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "In Library" };
  }
  if (membership.pendingIds.has(id)) return { icon: Icon.Clock, tooltip: "Adding…" };
  return undefined;
}
