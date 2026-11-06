import { Color, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";

import { getLibraryMembership, getLibraryPlaylistLinks, LibraryPlaylistLink } from "../util/catalog-api";

// Polling only runs while an add is pending, against a batched request per
// kind — gentle enough for Apple, fast enough that the badge flips within a
// few seconds of the add landing via cloud sync.
const PENDING_POLL_MS = 5000;
// Cloud sync normally lands in seconds, occasionally minutes. Past this the
// "Adding…" badge is dropped rather than polling for the rest of the
// session; Add to Library stays available as the retry (and warns if the
// add did land after all).
const PENDING_TIMEOUT_MS = 2 * 60 * 1000;

const EMPTY_SET: ReadonlySet<string> = new Set();
const NO_LINKS: ReadonlyMap<string, LibraryPlaylistLink> = new Map();

const fetchMembership = (kind: "albums" | "songs", ids: string[]) =>
  pipe(
    getLibraryMembership(kind, ids),
    // Badges are decoration — on failure they simply don't render, rather
    // than surfacing an error for something the user didn't ask for.
    TE.getOrElse(() => T.of(new Set<string>())),
  )();

const fetchPlaylistLinks = () =>
  pipe(
    getLibraryPlaylistLinks(),
    TE.getOrElse(() => T.of(NO_LINKS)),
  )();

/** Library-membership state for a set of catalog items: which are already in
 * the library, plus a session "Adding…" set for items whose add was accepted
 * (202) but hasn't landed via cloud sync yet. While anything is pending,
 * membership is re-checked every few seconds so the badge flips to In
 * Library on arrival; a pending add that never lands expires after a couple
 * of minutes.
 *
 * Albums and songs use Apple's `include=library` linkage. Playlists have no
 * such linkage, so they're resolved through the account's library playlists
 * instead, which also says whether each one is the user's own (`canEdit`) —
 * exposed as `ownPlaylistIds`. Pass referentially stable arrays (memoize
 * derived ones) — a new array identity per render would refetch every
 * render. */
export function useLibraryMembership(albumIds: string[], songIds: string[], playlistIds: string[] = []) {
  const [pending, setPending] = useState<ReadonlyMap<string, number>>(new Map());

  const { data, revalidate } = usePromise(
    async (albums: string[], songs: string[], playlists: string[]) => {
      const [albumMatches, songMatches, links] = await Promise.all([
        fetchMembership("albums", albums),
        fetchMembership("songs", songs),
        playlists.length > 0 ? fetchPlaylistLinks() : Promise.resolve(NO_LINKS),
      ]);
      const inLibrary = new Set([...albumMatches, ...songMatches]);
      const ownPlaylistIds = new Set<string>();
      for (const id of playlists) {
        const link = links.get(id);
        if (!link) continue;
        inLibrary.add(id);
        if (link.canEdit) ownPlaylistIds.add(id);
      }
      return { inLibrary, ownPlaylistIds };
    },
    [albumIds, songIds, playlistIds],
    { execute: albumIds.length + songIds.length + playlistIds.length > 0 },
  );
  const inLibrary = data?.inLibrary;

  useEffect(() => {
    if (pending.size === 0) return;
    const interval = setInterval(() => {
      const cutoff = Date.now() - PENDING_TIMEOUT_MS;
      setPending((prev) => {
        const next = new Map([...prev].filter(([, startedAt]) => startedAt > cutoff));
        return next.size === prev.size ? prev : next;
      });
      revalidate();
    }, PENDING_POLL_MS);
    return () => clearInterval(interval);
  }, [pending.size, revalidate]);

  // A pending add that now shows up in the library has landed.
  useEffect(() => {
    if (!inLibrary) return;
    setPending((prev) => {
      const next = new Map([...prev].filter(([id]) => !inLibrary.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [inLibrary]);

  const markPending = (id: string) => setPending((prev) => new Map([...prev, [id, Date.now()]]));
  return {
    inLibrary: inLibrary ?? EMPTY_SET,
    ownPlaylistIds: data?.ownPlaylistIds ?? EMPTY_SET,
    pendingIds: new Set(pending.keys()) as ReadonlySet<string>,
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
