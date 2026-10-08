import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { useMyPlaylists } from "../hooks/useMyPlaylists";
import { useMe } from "../hooks/useMe";
import { getPlaylistSnapshot, playlistContainsTrack } from "../api/playlistContainsTrack";
import { addToPlaylist } from "../api/addToPlaylist";
import { removeFromPlaylist } from "../api/removeFromPlaylist";
import { CreateQuicklink } from "./CreateQuicklink";

export function PlaylistPicker({ uri, quicklinks = false }: { uri: string; quicklinks?: boolean }) {
  const { myPlaylistsData, myPlaylistsIsLoading } = useMyPlaylists();
  const { meData, meIsLoading } = useMe();
  const [selectedId, setSelectedId] = useState<string>();
  const busy = useRef(false);
  const abortable = useRef<AbortController | null>(null);
  const {
    data: membership,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (id: string, trackUri: string) => {
      const signal = abortable.current?.signal;
      const snapshot = await getPlaylistSnapshot(id, signal);
      const contains = await playlistContainsTrack(id, trackUri, signal);
      return { id, uri: trackUri, snapshot, contains };
    },
    [selectedId ?? "", uri],
    { execute: !!selectedId, abortable },
  );

  return (
    <List
      searchBarPlaceholder="Search for Playlist"
      isLoading={myPlaylistsIsLoading || meIsLoading || isLoading}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      {myPlaylistsData?.items
        ?.filter((playlist) => playlist.owner?.id === meData?.id)
        .map((playlist) => {
          if (!playlist.id || !playlist.name) return null;
          const id = playlist.id;
          const checked = membership?.id === id && membership.uri === uri && !isLoading && !error;
          const contains = checked && membership.contains;
          return (
            <List.Item
              key={id}
              id={id}
              title={playlist.name}
              icon={playlist.images?.[0]?.url ?? Icon.List}
              accessories={contains ? [{ icon: Icon.Checkmark, tooltip: "Already in playlist" }] : []}
              actions={
                <ActionPanel>
                  <Action
                    title={
                      !checked ? "Add or Remove from Playlist" : contains ? "Remove from Playlist" : "Add to Playlist"
                    }
                    icon={contains ? Icon.Minus : Icon.Plus}
                    onAction={async () => {
                      if (busy.current) return;
                      busy.current = true;
                      try {
                        await showToast({ title: "Checking Playlist", style: Toast.Style.Animated });
                        const unchanged =
                          checked && !!membership.snapshot && membership.snapshot === (await getPlaylistSnapshot(id));
                        const exists = unchanged ? membership.contains : await playlistContainsTrack(id, uri);
                        if (checked && exists !== membership.contains) {
                          await revalidate();
                          await showToast({
                            title: "Playlist Changed",
                            message: "The playlist was updated elsewhere. Choose the updated action to continue.",
                            style: Toast.Style.Failure,
                          });
                          return;
                        }
                        if (exists) {
                          await removeFromPlaylist({ playlistId: id, trackUris: [{ uri }] });
                        } else {
                          await addToPlaylist({ playlistId: id, trackUris: [uri] });
                        }
                        const title = exists ? `Removed from ${playlist.name}` : `Added to ${playlist.name}`;
                        await showToast({ title });
                        await revalidate().catch(() => undefined);
                        if (getPreferenceValues().closeWindowOnAction) {
                          await showHUD(title);
                          await popToRoot();
                        }
                      } catch (error) {
                        await showToast({
                          title: "Could not update playlist",
                          message: String(error),
                          style: Toast.Style.Failure,
                        });
                      } finally {
                        busy.current = false;
                      }
                    }}
                  />
                  {quicklinks && (
                    <CreateQuicklink
                      title={`Create Quicklink to Add to ${playlist.name}`}
                      quicklinkTitle={`Add Playing Song to ${playlist.name}`}
                      command="addPlayingSongToPlaylist"
                      data={{ playlistId: id }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
