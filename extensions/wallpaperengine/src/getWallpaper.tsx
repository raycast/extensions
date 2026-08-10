import { List, Action, ActionPanel, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { getMonitors } from "./utils/monitors";
import { getCurrentWallpaperPath } from "./utils/discovery";
import { MonitorInfo } from "./utils/types";

export default function GetWallpaper() {
  const [monitors, setMonitors] = useState<
    { info: MonitorInfo; wallpaper: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const monitors = await getMonitors();
      const results = [];
      for (const m of monitors) {
        try {
          const wallpaper = await getCurrentWallpaperPath(m.index);
          results.push({ info: m, wallpaper: wallpaper || "Unknown" });
        } catch {
          results.push({ info: m, wallpaper: "Unknown" });
        }
      }
      setMonitors(results);
      setIsLoading(false);
    }
    load();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search monitors...">
      {monitors.map((m) => (
        <List.Item
          key={m.info.index}
          title={`Monitor ${m.info.index}: ${m.info.name}`}
          subtitle={m.wallpaper}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Path"
                icon={Icon.Clipboard}
                content={m.wallpaper}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
