import React, { useEffect, useState } from "react";
import { List, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { ListItem } from "./list-item";
import { AppEntry } from "./types";

const execAsync = promisify(exec);

async function buildAppMap(): Promise<Map<string, string>> {
  const appMap = new Map<string, string>();

  try {
    const { stdout } = await execAsync(
      `find /Applications ~/Applications /System/Applications -name "*.app" -maxdepth 2 2>/dev/null`,
    );
    const paths = stdout.trim().split("\n");

    for (const fullPath of paths) {
      const nameMatch = fullPath.match(/\/([^/]+)\.app$/);
      if (!nameMatch) continue;
      const name = nameMatch[1].trim();
      if (name && !appMap.has(name)) {
        appMap.set(name, fullPath);
      }
    }
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to scan apps", message: String(error) });
  }

  return appMap;
}

export default function Command() {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRunningApps() {
      try {
        const appMap = await buildAppMap();

        const { stdout } = await execAsync(
          `osascript -e 'tell application "System Events" to get name of every process'`,
        );

        const rawNames = stdout
          .split(", ")
          .map((name) => name.trim())
          .filter((name, index, self) => !!name && self.indexOf(name) === index);

        const resolvedApps: AppEntry[] = [];

        const DENY_LIST = ["Finder", "WindowServer", "loginwindow", "SystemUIServer"];
        for (const name of rawNames) {
          const path = appMap.get(name);
          if (!path) continue;
          if (DENY_LIST.includes(name)) continue;

          resolvedApps.push({
            name,
            iconPath: path,
            brand: "",
            location: path.replace(/\/[^/]+\.app$/, ""),
          });
        }

        setApps(resolvedApps.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Could not fetch running apps", message: String(error) });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRunningApps();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Applications...">
      <List.Section title="Running Apps" subtitle={apps.length.toString()}>
        {apps.map((app) => (
          <ListItem key={app.name} app={app} />
        ))}
      </List.Section>
    </List>
  );
}
