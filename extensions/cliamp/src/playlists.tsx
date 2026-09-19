import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { callOp, listProviders, ProviderPlaylist, Track, trackLabel } from "./lib/ipc";

async function act(operation: string, params: Record<string, unknown>, title: string, message?: string) {
  try {
    await callOp(operation, params);
    await showToast({ style: Toast.Style.Success, title, message });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "cliamp error",
      message: String(e instanceof Error ? e.message : e),
    });
  }
}

function PlaylistTracks({ provider, playlist }: { provider: string; playlist: ProviderPlaylist }) {
  const { data, isLoading } = usePromise(async () => {
    const res = await callOp<{ tracks?: Track[] }>("provider.tracks", {
      provider,
      playlist: playlist.id,
      offset: 0,
      limit: 200,
    });
    return res.tracks ?? [];
  });

  return (
    <List isLoading={isLoading} navigationTitle={playlist.name} searchBarPlaceholder={`Filter ${playlist.name}…`}>
      {(data ?? []).map((t, i) => (
        <List.Item
          key={`${t.path ?? t.title ?? "t"}-${i}`}
          icon={t.stream ? Icon.Livestream : Icon.Music}
          title={trackLabel(t)}
          subtitle={t.artist}
          actions={
            <ActionPanel>
              <Action
                title="Play Now"
                icon={Icon.Play}
                onAction={() => act("track.play", { track: t }, "Playing", trackLabel(t))}
              />
              <Action
                title="Queue Next"
                icon={Icon.Forward}
                onAction={() => act("track.queue", { track: t }, "Queued next", trackLabel(t))}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function BrowsePlaylists() {
  const [provider, setProvider] = useState<string>("");
  const providers = usePromise(listProviders);

  const playlists = usePromise(
    async (prov: string): Promise<ProviderPlaylist[]> => {
      if (!prov) return [];
      const res = await callOp<{ playlists?: ProviderPlaylist[] }>("provider.playlists", {
        provider: prov,
        offset: 0,
        limit: 200,
      });
      return res.playlists ?? [];
    },
    [provider],
  );

  return (
    <List
      isLoading={providers.isLoading || playlists.isLoading}
      searchBarPlaceholder="Filter playlists…"
      searchBarAccessory={
        <List.Dropdown tooltip="Provider" storeValue onChange={setProvider}>
          {(providers.data ?? []).map((p) => (
            <List.Dropdown.Item key={p.key} title={p.name} value={p.key} />
          ))}
        </List.Dropdown>
      }
    >
      {(playlists.data ?? []).map((pl) => (
        <List.Item
          key={pl.id}
          icon={Icon.List}
          title={pl.name}
          actions={
            <ActionPanel>
              <Action
                title="Load into Live Playlist"
                icon={Icon.Download}
                onAction={() => act("provider.load", { provider, playlist: pl.id }, "Loaded", pl.name)}
              />
              <Action.Push
                title="Browse Tracks"
                icon={Icon.ChevronRight}
                target={<PlaylistTracks provider={provider} playlist={pl} />}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView icon={Icon.List} title="No playlists" description="This provider has no playlists to show." />
    </List>
  );
}
