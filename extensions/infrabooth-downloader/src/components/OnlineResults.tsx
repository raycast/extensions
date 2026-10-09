import { ActionPanel, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import type { RemoteTrack } from "../shared/remote-protocol";
import type { OnlineView } from "../hooks/useOnlineSearch";
import { onlineSections, type OnlineSearchResults } from "../lib/onlineSearch";
import { systemPlaylistTracks, toLibraryPlaylist, type ResolvedLink } from "../lib/resolveLink";
import { ShowAllItem } from "./ShowAllItem";
import { PlaylistListItem } from "./PlaylistListItem";
import { ResultsSection } from "./ResultsSection";
import { TrackListItem } from "./TrackListItem";

interface OnlineResultsProps {
  view: OnlineView;
  isLoading: boolean;
  extraActions: ReactNode;
}

export function OnlineResults({ view, isLoading, extraActions }: OnlineResultsProps) {
  const actions = <ActionPanel>{extraActions}</ActionPanel>;
  if (view.mode === "idle") {
    return (
      <List.EmptyView
        icon={Icon.Globe}
        title="Search SoundCloud"
        description="Search tracks, playlists and albums, or paste a SoundCloud link."
        actions={actions}
      />
    );
  }
  if (view.mode === "link") {
    if (view.error) {
      return (
        <List.EmptyView icon={Icon.Warning} title="Could Not Open Link" description={view.error} actions={actions} />
      );
    }
    if (!view.resolved) return <List.EmptyView icon={Icon.Link} title="Opening Link…" actions={actions} />;
    return <LinkSection link={view.link} resolved={view.resolved} extraActions={extraActions} />;
  }
  return (
    <>
      {isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching SoundCloud…" actions={actions} />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results"
          description={`No tracks, playlists or albums found for “${view.query}”.`}
          actions={actions}
        />
      )}
      {view.results && <OnlineSections query={view.query} results={view.results} extraActions={extraActions} />}
    </>
  );
}

interface LinkSectionProps {
  link: string;
  resolved: ResolvedLink;
  extraActions: ReactNode;
}

function LinkSection({ link, resolved, extraActions }: LinkSectionProps) {
  if (resolved.kind === "track")
    return <LinkTracks title="Link" tracks={[resolved.track]} extraActions={extraActions} />;
  const tracks = systemPlaylistTracks(resolved.playlist);
  if (tracks) return <LinkTracks title={resolved.playlist.title} tracks={tracks} extraActions={extraActions} />;
  return (
    <List.Section title="Link">
      <PlaylistListItem playlist={toLibraryPlaylist(resolved.playlist, link)} extraActions={extraActions} />
    </List.Section>
  );
}

interface LinkTracksProps {
  title: string;
  tracks: RemoteTrack[];
  extraActions: ReactNode;
}

function LinkTracks({ title, tracks, extraActions }: LinkTracksProps) {
  return (
    <List.Section title={title}>
      {tracks.map((track, index) => (
        <TrackListItem
          key={`${track.trackId}-${index}`}
          track={track}
          playContext={{ tracks, startIndex: index }}
          extraActions={extraActions}
        />
      ))}
    </List.Section>
  );
}

interface OnlineSectionsProps {
  query: string;
  results: OnlineSearchResults;
  extraActions: ReactNode;
}

function OnlineSections({ query, results, extraActions }: OnlineSectionsProps) {
  return onlineSections(results).map((section) => (
    <ResultsSection
      key={section.kind}
      title={section.title}
      results={section.results}
      playAsList={false}
      extraActions={extraActions}
      footer={section.showAll && <ShowAllItem kind={section.kind} query={query} extraActions={extraActions} />}
    />
  ));
}
