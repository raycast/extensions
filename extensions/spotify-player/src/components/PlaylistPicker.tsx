import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
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
import { playlistContainsTrack } from "../api/playlistContainsTrack";
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
    async (id: string, trackUri: string) => ({
      id,
      uri: trackUri,
      contains: await playlistContainsTrack(id, trackUri, abortable.current?.signal),
    }),
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
                        // Recheck at mutation time: stale membership and failed requests must never add duplicates.
                        const exists = await playlistContainsTrack(id, uri);
                        const invalidateItems = () =>
                          Promise.allSettled([
                            LocalStorage.removeItem(`playlistItems_${id}`),
                            LocalStorage.removeItem(`playlistItems_${id}_cachedAt`),
                          ]);
                        const add = async () => {
                          await addToPlaylist({ playlistId: id, trackUris: [uri] });
                          await invalidateItems();
                          await showToast({ title: `Added to ${playlist.name}` });
                          await revalidate().catch(() => undefined);
                          if (getPreferenceValues().closeWindowOnAction) {
                            await showHUD(`Added to ${playlist.name}`);
                            await popToRoot();
                          }
                        };
                        if (exists && checked && !contains) {
                          await showToast({
                            title: "Duplicate found",
                            style: Toast.Style.Failure,
                            primaryAction: {
                              title: "Add to playlist anyways",
                              onAction: async () => {
                                if (busy.current) return;
                                busy.current = true;
                                try {
                                  await add();
                                } catch (error) {
                                  await showToast({
                                    title: "Could not add to playlist",
                                    message: String(error),
                                    style: Toast.Style.Failure,
                                  });
                                } finally {
                                  busy.current = false;
                                }
                              },
                            },
                          });
                        } else if (exists) {
                          await removeFromPlaylist({ playlistId: id, trackUris: [{ uri }] });
                          await invalidateItems();
                          await showToast({ title: `Removed from ${playlist.name}` });
                          await revalidate().catch(() => undefined);
                          if (getPreferenceValues().closeWindowOnAction) {
                            await showHUD(`Removed from ${playlist.name}`);
                            await popToRoot();
                          }
                        } else await add();
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
