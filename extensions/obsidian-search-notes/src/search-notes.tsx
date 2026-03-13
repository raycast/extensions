import {
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import * as fs from "fs";
import * as path from "path";

interface Preferences {
  vaultPath: string;
  vaultName: string;
  ignoreFolders: string;
}

interface NoteItem {
  name: string;
  relativePath: string;
  absolutePath: string;
  modifiedAt: Date;
  sizeBytes: number;
  folder: string;
}

function getObsidianURI(vaultName: string, relativePath: string): string {
  // obsidian://open?vault=VaultName&file=path/to/note (without .md extension)
  const fileWithoutExt = relativePath.replace(/\.md$/, "");
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(fileWithoutExt)}`;
}

function walkMarkdownFiles(
  dir: string,
  baseDir: string,
  ignoreFolders: Set<string>,
  results: NoteItem[] = [],
): NoteItem[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (ignoreFolders.has(entry.name) || entry.name.startsWith(".")) continue;
      walkMarkdownFiles(fullPath, baseDir, ignoreFolders, results);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      try {
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(baseDir, fullPath);
        const folder = path.dirname(relativePath);
        results.push({
          name: entry.name.replace(/\.md$/, ""),
          relativePath,
          absolutePath: fullPath,
          modifiedAt: stat.mtime,
          sizeBytes: stat.size,
          folder: folder === "." ? "" : folder,
        });
      } catch {
        // skip files we can't stat
      }
    }
  }

  return results;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAccessoryColor(date: Date): Color {
  const diffMs = Date.now() - date.getTime();
  const diffHours = diffMs / 3600000;
  if (diffHours < 1) return Color.Green;
  if (diffHours < 24) return Color.Blue;
  if (diffHours < 72) return Color.Orange;
  return Color.SecondaryText;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ignoreFolders = useMemo(
    () =>
      new Set(
        (prefs.ignoreFolders || ".obsidian,.trash,templates,attachments")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    [prefs.ignoreFolders],
  );

  useEffect(() => {
    const vaultPath = prefs.vaultPath.replace(/^~/, process.env.HOME || "");

    if (!fs.existsSync(vaultPath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Vault not found",
        message: `Path does not exist: ${vaultPath}`,
      });
      setIsLoading(false);
      return;
    }

    const allNotes = walkMarkdownFiles(vaultPath, vaultPath, ignoreFolders);
    allNotes.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
    setNotes(allNotes);
    setIsLoading(false);
  }, [prefs.vaultPath, ignoreFolders]);

  // Group by time buckets for section headers
  const sections = useMemo(() => {
    const buckets: { title: string; notes: NoteItem[] }[] = [
      { title: "Today", notes: [] },
      { title: "Yesterday", notes: [] },
      { title: "This Week", notes: [] },
      { title: "This Month", notes: [] },
      { title: "Older", notes: [] },
    ];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(
      startOfToday.getFullYear(),
      startOfToday.getMonth(),
      1,
    );

    for (const note of notes) {
      const t = note.modifiedAt.getTime();
      if (t >= startOfToday.getTime()) {
        buckets[0].notes.push(note);
      } else if (t >= startOfYesterday.getTime()) {
        buckets[1].notes.push(note);
      } else if (t >= startOfWeek.getTime()) {
        buckets[2].notes.push(note);
      } else if (t >= startOfMonth.getTime()) {
        buckets[3].notes.push(note);
      } else {
        buckets[4].notes.push(note);
      }
    }

    return buckets.filter((b) => b.notes.length > 0);
  }, [notes]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search notes...">
      {sections.map((section) => (
        <List.Section
          key={section.title}
          title={section.title}
          subtitle={`${section.notes.length}`}
        >
          {section.notes.map((note) => (
            <List.Item
              key={note.absolutePath}
              title={note.name}
              subtitle={note.folder}
              accessories={[
                { text: formatSize(note.sizeBytes) },
                {
                  tag: {
                    value: formatRelativeTime(note.modifiedAt),
                    color: getAccessoryColor(note.modifiedAt),
                  },
                },
              ]}
              icon={Icon.Document}
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Open in Obsidian"
                    target={getObsidianURI(prefs.vaultName, note.relativePath)}
                    icon={Icon.Globe}
                  />
                  <Action.Open
                    title="Open in Default Editor"
                    target={note.absolutePath}
                  />
                  <Action.ShowInFinder path={note.absolutePath} />
                  <Action.CopyToClipboard
                    title="Copy File Path"
                    content={note.absolutePath}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Obsidian Uri"
                    content={getObsidianURI(prefs.vaultName, note.relativePath)}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  />
                  <Action.Open
                    title="Open Folder in Finder"
                    target={path.dirname(note.absolutePath)}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "f" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
