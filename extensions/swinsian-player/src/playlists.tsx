import { List, ActionPanel, Action, Icon, Color, showHUD, Keyboard } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import {
  getPlaylists,
  playPlaylist,
  createPlaylist,
  addTrackToPlaylist,
  exportCurrentPlaylistToM3U,
  Playlist,
} from "./helpers/swinsian";
import { Form, useNavigation } from "@raycast/api";

type FilterType = "all" | "normal" | "smart";
interface Track {
  id?: string;
  name: string;
  artist: string;
  path: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function Playlists({
  trackToAdd,
  addCurrentTrack = false,
}: {
  trackToAdd?: Track;
  addCurrentTrack?: boolean;
}) {
  const [filter, setFilter] = useCachedState<FilterType>("swinsian-playlist-filter", "all");
  const { pop } = useNavigation();
  const isAddMode = addCurrentTrack || !!trackToAdd;

  const {
    data: playlists = [],
    isLoading,
    revalidate,
  } = useCachedPromise(getPlaylists, [], {
    keepPreviousData: true,
  });

  const filtered = playlists.filter((pl) => {
    if (filter === "smart") return pl.smart;
    if (filter === "normal") return !pl.smart;
    return true;
  });

  const smartPlaylists = filtered.filter((p) => p.smart);
  const normalPlaylists = filtered.filter((p) => !p.smart);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={isAddMode ? "Choose a playlist to add to…" : "Filter playlists…"}
      navigationTitle={isAddMode ? "Add to Playlist — Swinsian" : "Playlists — Swinsian"}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(v) => setFilter(v as FilterType)}>
          <List.Dropdown.Item title="All Playlists" value="all" />
          <List.Dropdown.Item title="Normal Playlists" value="normal" />
          <List.Dropdown.Item title="Smart Playlists" value="smart" />
        </List.Dropdown>
      }
    >
      {normalPlaylists.length > 0 && (
        <List.Section title="Playlists">
          {normalPlaylists.map((pl) => (
            <PlaylistItem
              key={pl.id}
              playlist={pl}
              onRefresh={revalidate}
              trackToAdd={trackToAdd}
              addCurrentTrack={addCurrentTrack}
              onTrackAdded={() => trackToAdd && pop()}
            />
          ))}
        </List.Section>
      )}
      {smartPlaylists.length > 0 && (
        <List.Section title="Smart Playlists">
          {smartPlaylists.map((pl) => (
            <PlaylistItem
              key={pl.id}
              playlist={pl}
              onRefresh={revalidate}
              trackToAdd={trackToAdd}
              addCurrentTrack={addCurrentTrack}
              onTrackAdded={() => trackToAdd && pop()}
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Playlist Tools">
        <List.Item
          icon={Icon.Download}
          title="Export Current Playlist (M3U)"
          actions={
            <ActionPanel>
              <Action
                title="Export Current Playlist (M3U)"
                icon={Icon.Download}
                onAction={async () => {
                  try {
                    const result = await exportCurrentPlaylistToM3U();
                    if (result) await showHUD(result);
                  } catch (error) {
                    await showHUD(`Error: ${errorMessage(error)}`);
                  }
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Plus}
          title="Create New Playlist"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Playlist"
                icon={Icon.Plus}
                target={<CreatePlaylistForm onCreated={revalidate} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.RotateClockwise}
          title="Refresh Playlists"
          actions={
            <ActionPanel>
              <Action title="Refresh Playlists" icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List.Section>

      {!isLoading && playlists.length === 0 && (
        <List.EmptyView icon={Icon.List} title="No Playlists" description="Create a playlist in Swinsian first." />
      )}
    </List>
  );
}

function PlaylistItem({
  playlist,
  onRefresh,
  trackToAdd,
  addCurrentTrack,
  onTrackAdded,
}: {
  playlist: Playlist;
  onRefresh: () => void;
  trackToAdd?: Track;
  addCurrentTrack?: boolean;
  onTrackAdded?: () => void;
}) {
  const isAddMode = addCurrentTrack || !!trackToAdd;
  const addTitle = trackToAdd
    ? `Add "${trackToAdd.name}" to "${playlist.name}"`
    : `Add Current Track to "${playlist.name}"`;

  return (
    <List.Item
      icon={
        playlist.smart ? { source: Icon.Wand, tintColor: Color.Purple } : { source: Icon.List, tintColor: Color.Blue }
      }
      title={playlist.name}
      accessories={[
        { text: `${playlist.trackCount} track${playlist.trackCount !== 1 ? "s" : ""}` },
        ...(playlist.smart ? [{ tag: { value: "Smart", color: Color.Purple } }] : []),
      ]}
      actions={
        <ActionPanel>
          {isAddMode && !playlist.smart ? (
            <Action
              title={addTitle}
              icon={Icon.Plus}
              onAction={async () => {
                try {
                  await addTrackToPlaylist(playlist.id, trackToAdd?.id);
                  await showHUD(`Added to "${playlist.name}"`);
                  onRefresh();
                  if (onTrackAdded) onTrackAdded();
                } catch (error) {
                  await showHUD(`Error: ${errorMessage(error)}`);
                }
              }}
            />
          ) : isAddMode && playlist.smart ? (
            <Action
              title="Smart Playlists Cannot Be Edited"
              icon={Icon.Lock}
              onAction={() => showHUD("Choose a normal playlist to add tracks")}
            />
          ) : (
            <Action
              title="Play Playlist"
              icon={Icon.Play}
              onAction={async () => {
                await playPlaylist(playlist.id);
                await showHUD(`Playing "${playlist.name}"`);
              }}
            />
          )}
          {!playlist.smart && !trackToAdd && (
            <Action
              title="Add Current Track to This Playlist"
              icon={Icon.Plus}
              onAction={async () => {
                try {
                  await addTrackToPlaylist(playlist.id);
                  await showHUD(`Added track to "${playlist.name}"`);
                  onRefresh();
                } catch (error) {
                  await showHUD(`Error: ${errorMessage(error)}`);
                }
              }}
            />
          )}
          {trackToAdd && (
            <Action
              title="Play Playlist"
              icon={Icon.Play}
              onAction={async () => {
                await playPlaylist(playlist.id);
                await showHUD(`Playing "${playlist.name}"`);
              }}
            />
          )}
          <Action.Push
            title="Create New Playlist"
            icon={Icon.Plus}
            target={<CreatePlaylistForm onCreated={onRefresh} />}
            shortcut={Keyboard.Shortcut.Common.New}
          />
        </ActionPanel>
      }
    />
  );
}

function CreatePlaylistForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    if (!values.name) return;
    try {
      await createPlaylist(values.name);
      await showHUD(`Created playlist "${values.name}"`);
      onCreated();
      pop();
    } catch (error) {
      await showHUD(`Error: ${errorMessage(error)}`);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Playlist" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Playlist Name" placeholder="e.g. My Favorites" autoFocus />
    </Form>
  );
}
