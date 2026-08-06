import {
  List,
  Action,
  ActionPanel,
  showToast,
  Toast,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getCachedPlaylists, discoverPlaylists } from "./utils/discovery";
import { execWallpaperEngine } from "./utils/cli";
import { getMonitors } from "./utils/monitors";
import { MonitorInfo } from "./utils/types";

export default function OpenPlaylist() {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function load() {
      const monitors = await getMonitors();
      setMonitors(monitors);
      setIsLoading(false);
    }
    load();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a monitor...">
      <List.Item
        title="All Monitors"
        subtitle="Apply to all monitors"
        actions={
          <ActionPanel>
            <Action
              title="Select"
              icon={Icon.Checkmark}
              onAction={() =>
                push(<PlaylistPicker monitor={null} allMonitors={monitors} />)
              }
            />
          </ActionPanel>
        }
      />
      {monitors.map((m) => (
        <List.Item
          key={m.index}
          title={`Monitor ${m.index}: ${m.name}`}
          subtitle={`${m.width}x${m.height}`}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                icon={Icon.Checkmark}
                onAction={() =>
                  push(<PlaylistPicker monitor={m} allMonitors={[]} />)
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function PlaylistPicker({
  monitor,
  allMonitors,
}: {
  monitor: MonitorInfo | null;
  allMonitors: MonitorInfo[];
}) {
  const [playlists, setPlaylists] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const cached = await getCachedPlaylists();
        if (cached.length > 0) {
          setPlaylists(cached);
          setIsLoading(false);
        }
        const discovered = await discoverPlaylists();
        setPlaylists(discovered);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const refreshPlaylists = async () => {
    setIsLoading(true);
    try {
      const discovered = await discoverPlaylists();
      setPlaylists(discovered);
      await showToast({
        style: Toast.Style.Success,
        title: "Playlist list refreshed",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Refresh failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  async function handleOpen(playlist: string) {
    try {
      if (allMonitors.length > 0) {
        for (const m of allMonitors) {
          const args = [
            "openPlaylist",
            "-playlist",
            playlist,
            "-monitor",
            m.index.toString(),
          ];
          await execWallpaperEngine(args);
        }
        await showToast({
          style: Toast.Style.Success,
          title: `Playlist opened on ${allMonitors.length} monitors`,
        });
      } else {
        const args = ["openPlaylist", "-playlist", playlist];
        if (monitor) {
          args.push("-monitor", monitor.index.toString());
        }
        await execWallpaperEngine(args);
        await showToast({
          style: Toast.Style.Success,
          title: "Playlist opened",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Select Playlist"
      searchBarPlaceholder="Search playlists..."
      actions={
        <ActionPanel>
          <Action
            title="Refresh Playlist List"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refreshPlaylists}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Playlists">
        {playlists.map((playlist) => (
          <List.Item
            key={playlist}
            title={playlist}
            actions={
              <ActionPanel>
                <Action
                  title="Open"
                  icon={Icon.Play}
                  onAction={() => handleOpen(playlist)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
