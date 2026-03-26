import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { homedir } from "os";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

interface ChangelogEntry {
  extensionName: string;
  extensionTitle: string;
  author: string;
  version: string;
  date: Date;
  dateString: string;
  changes: string;
  changelogUrl: string;
  extensionUrl: string;
  authorUrl: string;
}

interface Extension {
  name: string;
  title: string;
  author: string;
}

type SortOrder = "desc" | "asc";

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export default function Command() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedExtension, setSelectedExtension] = useState<string>("all");
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  const loadChangelogEntries = async (forceRefresh = false) => {
    // Check if we need to fetch
    const now = Date.now();
    const isCacheStale = !lastFetchTime || now - lastFetchTime > CACHE_DURATION_MS;

    if (!forceRefresh && !isCacheStale && entries.length > 0) {
      // Data is fresh, no need to fetch
      setIsLoading(false);
      return;
    }

    // Keep existing data visible while loading
    setIsLoading(true);

    try {
      const extensionsPath = join(homedir(), ".config", "raycast", "extensions");
      const dirs = await readdir(extensionsPath, { withFileTypes: true });

      const extensions: Extension[] = [];
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;

        try {
          const packageJsonPath = join(extensionsPath, dir.name, "package.json");
          const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));

          if (packageJson.name && packageJson.title && packageJson.author) {
            extensions.push({
              name: packageJson.name,
              title: packageJson.title,
              author: packageJson.author,
            });
          }
        } catch {
          continue;
        }
      }

      const allEntries: ChangelogEntry[] = [];

      await Promise.all(
        extensions.map(async (ext) => {
          try {
            const rawUrl = `https://raw.githubusercontent.com/raycast/extensions/main/extensions/${ext.name}/CHANGELOG.md`;
            const response = await fetch(rawUrl);

            if (!response.ok) return;

            const text = await response.text();
            const parsed = parseChangelog(text, ext);
            allEntries.push(...parsed);
          } catch {
            return;
          }
        }),
      );

      setEntries(allEntries);
      setLastFetchTime(Date.now());

      if (forceRefresh) {
        showToast({
          style: Toast.Style.Success,
          title: "Changelog refreshed",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load changelog entries",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChangelogEntries();
  }, []);

  const sortedEntries = [...entries].sort((a, b) => {
    if (sortOrder === "desc") {
      return b.date.getTime() - a.date.getTime();
    } else {
      return a.date.getTime() - b.date.getTime();
    }
  });

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };

  // Get unique extension names from entries
  const extensionNames = Array.from(new Set(entries.map((entry) => entry.extensionTitle))).sort();

  // Filter entries by selected extension
  const filteredEntries =
    selectedExtension === "all"
      ? sortedEntries
      : sortedEntries.filter((entry) => entry.extensionTitle === selectedExtension);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search changelog entries..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Extension" value={selectedExtension} onChange={setSelectedExtension}>
          <List.Dropdown.Item title="All Extensions" value="all" />
          {extensionNames.map((extensionName) => (
            <List.Dropdown.Item key={extensionName} title={extensionName} value={extensionName} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredEntries.map((entry, index) => {
        const accessories = [{ tag: { value: entry.dateString } }];

        return (
          <List.Item
            key={`${entry.extensionName}-${entry.version}-${index}`}
            title={entry.extensionTitle}
            subtitle={entry.changes.split("\n")[0]}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Extension Page" url={entry.extensionUrl} icon={Icon.Box} />
                <Action.OpenInBrowser title="Open Changelog in GitHub" url={entry.changelogUrl} icon={Icon.Document} />
                <Action.OpenInBrowser title="Open Developer Profile" url={entry.authorUrl} icon={Icon.Person} />
                <ActionPanel.Section>
                  <Action
                    title="Refresh Changelog Feed"
                    icon={Icon.ArrowClockwise}
                    onAction={() => loadChangelogEntries(true)}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title={`Sort by Date (${sortOrder === "desc" ? "Newest First" : "Oldest First"})`}
                    icon={sortOrder === "desc" ? Icon.ArrowDown : Icon.ArrowUp}
                    onAction={toggleSortOrder}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Changes"
                    content={entry.changes}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Changelog URL"
                    content={entry.changelogUrl}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function parseChangelog(markdown: string, extension: Extension): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = markdown.split("\n");

  let currentVersion = "";
  let currentDate: Date | null = null;
  let currentDateString = "";
  let currentChanges: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match version headers like: ## [v1.2] - 2026-01-08 or ## [Initial Version] - 2023-10-25
    const versionMatch = line.match(/^##\s*\[([^\]]+)\]\s*-\s*(\d{4}-\d{2}-\d{2})/);

    if (versionMatch) {
      // Save previous entry if exists
      if (currentVersion && currentDate && currentChanges.length > 0) {
        entries.push({
          extensionName: extension.name,
          extensionTitle: extension.title,
          author: extension.author,
          version: currentVersion,
          date: currentDate,
          dateString: currentDateString,
          changes: currentChanges.join("\n").trim(),
          changelogUrl: `https://github.com/raycast/extensions/blob/main/extensions/${extension.name}/CHANGELOG.md`,
          extensionUrl: `https://www.raycast.com/${extension.author}/${extension.name}`,
          authorUrl: `https://www.raycast.com/${extension.author}`,
        });
      }

      // Start new entry
      currentVersion = versionMatch[1];
      currentDateString = versionMatch[2];
      currentDate = new Date(versionMatch[2]);
      currentChanges = [];
    } else if (currentVersion && line && !line.startsWith("#")) {
      // Collect change lines (skip empty lines and other headers)
      // Remove leading dash and whitespace from bullet points
      const cleanedLine = line.replace(/^-\s*/, "");
      currentChanges.push(cleanedLine);
    }
  }

  // Save last entry
  if (currentVersion && currentDate && currentChanges.length > 0) {
    entries.push({
      extensionName: extension.name,
      extensionTitle: extension.title,
      author: extension.author,
      version: currentVersion,
      date: currentDate,
      dateString: currentDateString,
      changes: currentChanges.join("\n").trim(),
      changelogUrl: `https://github.com/raycast/extensions/blob/main/extensions/${extension.name}/CHANGELOG.md`,
      extensionUrl: `https://www.raycast.com/${extension.author}/${extension.name}`,
      authorUrl: `https://www.raycast.com/${extension.author}`,
    });
  }

  return entries;
}
