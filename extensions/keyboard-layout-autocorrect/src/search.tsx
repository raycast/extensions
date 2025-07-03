import fs from "fs";
import path from "path";
import { exec } from "child_process";

import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import Fuse from "fuse.js";

import { cyrillicToEn } from "./utils";

function findAppBundles(dir: string): string[] {
  let results: string[] = [];
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (file.endsWith(".app")) {
            results.push(fullPath);
          } else {
            results = results.concat(findAppBundles(fullPath));
          }
        }
      } catch {
        // Ignore permission errors or broken symlinks
      }
    }
  } catch {
    // Ignore permission errors on root folders
  }
  return results;
}

function getApplications(): { id: string; title: string; path: string }[] {
  const appPaths = findAppBundles("/Applications");
  return appPaths.map((fullPath, idx) => ({
    id: String(idx),
    title: path.basename(fullPath, ".app"),
    path: fullPath,
  }));
}

function getAppIcon(appPath: string): string | Icon {
  // Try to find the .icns icon inside the .app bundle
  const iconPath = path.join(appPath, "Contents", "Resources");
  try {
    const files = fs.readdirSync(iconPath);
    const icns = files.find((f) => f.endsWith(".icns"));
    if (icns) {
      return path.join(iconPath, icns);
    }
  } catch {
    // ignore
  }
  return Icon.AppWindow;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [apps, setApps] = useState<{ id: string; title: string; path: string }[]>([]);

  useEffect(() => {
    setApps(getApplications());
  }, []);

  // Fuzzy search with fuse.js
  const fuse = new Fuse(apps, { keys: ["title"], threshold: 0.4 });
  let results = apps;
  if (searchText) {
    // Try both direct and autocorrected search
    const fuseResults = fuse.search(searchText);
    const autocorrected = cyrillicToEn(searchText);
    const fuseAutoResults = autocorrected !== searchText ? fuse.search(autocorrected) : [];
    // Merge and deduplicate
    const seen = new Set();
    results = [...fuseResults, ...fuseAutoResults]
      .map((r) => r.item)
      .filter((item) => {
        if (seen.has(item.title)) return false;
        seen.add(item.title);
        return true;
      });
  }

  return (
    <List
      searchBarPlaceholder="Search Applications..."
      onSearchTextChange={setSearchText}
      isLoading={apps.length === 0}
    >
      {results.map((item) => (
        <List.Item
          key={item.id}
          icon={getAppIcon(item.path)}
          title={item.title}
          accessories={[{ icon: Icon.Text, text: item.path }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Application"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  try {
                    exec(`open -a "${item.path}"`);
                  } catch {
                    await showToast({ style: Toast.Style.Failure, title: "Failed to open app" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
