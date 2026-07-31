import {
  List,
  Action,
  ActionPanel,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getMonitors } from "./utils/monitors";
import { execWallpaperEngine } from "./utils/cli";
import { MonitorInfo } from "./utils/types";

export default function NextWallpaper() {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const monitors = await getMonitors();
      setMonitors(monitors);
      setIsLoading(false);
    }
    load();
  }, []);

  async function handleNext(monitor: MonitorInfo | null) {
    try {
      const args = ["nextWallpaper"];
      if (monitor) {
        args.push("-monitor", monitor.index.toString());
      }
      await execWallpaperEngine(args);
      await showToast({ style: Toast.Style.Success, title: "Next wallpaper" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a monitor...">
      <List.Item
        title="All Monitors"
        subtitle="Skip to next on all monitors"
        actions={
          <ActionPanel>
            <Action
              title="Next"
              icon={Icon.Play}
              onAction={() => handleNext(null)}
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
                title="Next"
                icon={Icon.Play}
                onAction={() => handleNext(m)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
