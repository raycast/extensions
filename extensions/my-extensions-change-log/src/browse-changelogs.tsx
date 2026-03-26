import { List, ActionPanel, Action, Icon, Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { homedir } from "os";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

interface Extension {
  name: string;
  title: string;
  author?: string;
  description?: string;
  changelogUrl: string;
  lastUpdated?: Date;
}

type SortBy = "name" | "date";
type SortOrder = "asc" | "desc";

export default function Command() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedDeveloper, setSelectedDeveloper] = useState<string>("all");

  useEffect(() => {
    async function loadInstalledExtensions() {
      try {
        const extensionsPath = join(homedir(), ".config", "raycast", "extensions");
        const entries = await readdir(extensionsPath, { withFileTypes: true });

        const extensionPromises = entries
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => {
            try {
              const packageJsonPath = join(extensionsPath, entry.name, "package.json");
              const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));

              if (packageJson.name && packageJson.title) {
                // Try to get last updated date from package.json or use current date as fallback
                const lastUpdated = packageJson.lastUpdated ? new Date(packageJson.lastUpdated) : new Date();

                return {
                  name: packageJson.name,
                  title: packageJson.title,
                  author: packageJson.author,
                  description: packageJson.description,
                  changelogUrl: `https://github.com/raycast/extensions/blob/main/extensions/${packageJson.name}/CHANGELOG.md`,
                  lastUpdated,
                };
              }
            } catch {
              return null;
            }
            return null;
          });

        const loadedExtensions = (await Promise.all(extensionPromises)).filter((ext): ext is Extension => ext !== null);

        setExtensions(loadedExtensions);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load extensions",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadInstalledExtensions();
  }, []);

  const sortedExtensions = [...extensions].sort((a, b) => {
    let comparison = 0;

    if (sortBy === "name") {
      comparison = a.title.localeCompare(b.title);
    } else {
      // Sort by date
      const dateA = a.lastUpdated?.getTime() || 0;
      const dateB = b.lastUpdated?.getTime() || 0;
      comparison = dateB - dateA; // Default to newest first for dates
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const toggleSortBy = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order if clicking same sort
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Change sort type and reset to ascending
      setSortBy(newSortBy);
      setSortOrder(newSortBy === "name" ? "asc" : "desc");
    }
  };

  // Get unique developers from extensions
  const developers = Array.from(
    new Set(extensions.map((ext) => ext.author).filter((author): author is string => Boolean(author))),
  ).sort();

  // Filter extensions by selected developer
  const filteredExtensions =
    selectedDeveloper === "all" ? sortedExtensions : sortedExtensions.filter((ext) => ext.author === selectedDeveloper);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search extensions..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Developer" value={selectedDeveloper} onChange={setSelectedDeveloper}>
          <List.Dropdown.Item title="All Developers" value="all" />
          {developers.map((developer) => (
            <List.Dropdown.Item key={developer} title={developer} value={developer} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredExtensions.map((extension, index) => (
        <List.Item
          key={`${extension.name}-${index}`}
          title={extension.title}
          subtitle={extension.author}
          accessories={[{ text: extension.name }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Changelog"
                icon={Icon.Document}
                target={<ChangelogView extension={extension} />}
              />
              <Action.OpenInBrowser title="Open Changelog in Browser" url={extension.changelogUrl} />
              <ActionPanel.Section>
                <Action
                  title={`Sort by Name (${sortBy === "name" && sortOrder === "asc" ? "A-Z" : "Z-A"})`}
                  icon={sortBy === "name" ? (sortOrder === "asc" ? Icon.ArrowUp : Icon.ArrowDown) : Icon.Text}
                  onAction={() => toggleSortBy("name")}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title={`Sort by Date (${sortBy === "date" && sortOrder === "desc" ? "Newest First" : "Oldest First"})`}
                  icon={sortBy === "date" ? (sortOrder === "desc" ? Icon.ArrowDown : Icon.ArrowUp) : Icon.Calendar}
                  onAction={() => toggleSortBy("date")}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Changelog URL"
                  content={extension.changelogUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ChangelogView({ extension }: { extension: Extension }) {
  const [changelog, setChangelog] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchChangelog() {
      try {
        const rawUrl = `https://raw.githubusercontent.com/raycast/extensions/main/extensions/${extension.name}/CHANGELOG.md`;
        const response = await fetch(rawUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch changelog: ${response.statusText}`);
        }

        const text = await response.text();
        setChangelog(text);
      } catch (error) {
        setChangelog(
          `# Changelog Not Available\n\nCouldn't fetch changelog for **${extension.title}**.\n\n${String(error)}`,
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchChangelog();
  }, [extension]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={changelog}
      navigationTitle={`${extension.title} - Changelog`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={extension.changelogUrl} />
          <Action.CopyToClipboard
            title="Copy Changelog URL"
            content={extension.changelogUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
