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
import { getCachedWallpapers, discoverWallpapers } from "./utils/discovery";
import { execWallpaperEngine } from "./utils/cli";
import { getMonitors } from "./utils/monitors";
import { WallpaperInfo, MonitorInfo } from "./utils/types";

export default function OpenWallpaper() {
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
                push(<WallpaperPicker monitor={null} allMonitors={monitors} />)
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
                  push(<WallpaperPicker monitor={m} allMonitors={[]} />)
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function WallpaperPicker({
  monitor,
  allMonitors,
}: {
  monitor: MonitorInfo | null;
  allMonitors: MonitorInfo[];
}) {
  const [wallpapers, setWallpapers] = useState<WallpaperInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const cached = await getCachedWallpapers();
        if (cached.length > 0) {
          setWallpapers(cached);
          setIsLoading(false);
        }
        const discovered = await discoverWallpapers();
        setWallpapers(discovered);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const refreshWallpapers = async () => {
    setIsLoading(true);
    try {
      const discovered = await discoverWallpapers();
      setWallpapers(discovered);
      await showToast({
        style: Toast.Style.Success,
        title: "Wallpaper list refreshed",
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

  async function handleOpen(wallpaper: WallpaperInfo) {
    try {
      if (allMonitors.length > 0) {
        for (const m of allMonitors) {
          const args = [
            "openWallpaper",
            "-file",
            wallpaper.filePath,
            "-monitor",
            m.index.toString(),
          ];
          await execWallpaperEngine(args);
        }
        await showToast({
          style: Toast.Style.Success,
          title: `Wallpaper opened on ${allMonitors.length} monitors`,
        });
      } else {
        const args = ["openWallpaper", "-file", wallpaper.filePath];
        if (monitor) {
          args.push("-monitor", monitor.index.toString());
        }
        await execWallpaperEngine(args);
        await showToast({
          style: Toast.Style.Success,
          title: "Wallpaper opened",
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
      navigationTitle="Select Wallpaper"
      searchBarPlaceholder="Search wallpapers..."
      actions={
        <ActionPanel>
          <Action
            title="Refresh Wallpaper List"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refreshWallpapers}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Wallpapers">
        {wallpapers.map((w) => (
          <List.Item
            key={w.id}
            title={w.title}
            subtitle={`${w.type} • ${w.source}`}
            actions={
              <ActionPanel>
                <Action
                  title="Open"
                  icon={Icon.Play}
                  onAction={() => handleOpen(w)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
