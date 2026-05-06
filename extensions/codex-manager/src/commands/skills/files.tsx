import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showInFinder,
  showToast,
  trash,
} from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { useEffect, useState } from "react";
import type { Skill } from "@/types";
import { openInEditor } from "@/lib/editor";
import SkillEntryForm from "@/commands/skills/entry-form";

type Entry = {
  path: string;
  name: string;
  relativePath: string;
  isDirectory: boolean;
  depth: number;
  content?: string;
  contentNote?: string;
};

const MAX_COPY_SIZE = 200_000;

function getLanguageHint(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".md":
      return "markdown";
    case ".ts":
    case ".tsx":
      return "typescript";
    case ".js":
    case ".jsx":
      return "javascript";
    case ".json":
      return "json";
    case ".yml":
    case ".yaml":
      return "yaml";
    case ".toml":
      return "toml";
    case ".py":
      return "python";
    case ".sh":
      return "bash";
    case ".xml":
      return "xml";
    case ".html":
      return "html";
    case ".css":
      return "css";
    case ".txt":
      return "text";
    default:
      return "";
  }
}

async function collectEntries(basePath: string): Promise<Entry[]> {
  const entries: Entry[] = [];

  async function walk(currentPath: string, depth: number) {
    const dirEntries = await fs.readdir(currentPath, { withFileTypes: true });
    const ordered = dirEntries
      .filter((entry) => !entry.name.startsWith("."))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) {
          return a.isDirectory() ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    for (const entry of ordered) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      entries.push({
        path: fullPath,
        name: entry.name,
        relativePath,
        isDirectory: entry.isDirectory(),
        depth,
      });
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      }
    }
  }

  await walk(basePath, 0);
  return entries;
}

export default function SkillFiles({ skill }: { skill: Skill }) {
  const preferences = getPreferenceValues<Preferences>();
  const [items, setItems] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadEntries() {
    setIsLoading(true);
    try {
      const collected = await collectEntries(skill.path);
      const enriched: Entry[] = [];
      for (const entry of collected) {
        if (entry.isDirectory) {
          enriched.push(entry);
          continue;
        }
        try {
          const stat = await fs.stat(entry.path);
          if (stat.size > 200_000) {
            enriched.push({
              ...entry,
              contentNote: "File too large to preview.",
            });
            continue;
          }
          const buffer = await fs.readFile(entry.path);
          if (buffer.includes(0)) {
            enriched.push({
              ...entry,
              contentNote: "Binary file preview is not supported.",
            });
            continue;
          }
          const content = buffer.toString("utf8");
          const truncated = content.length > 20_000;
          enriched.push({
            ...entry,
            content: truncated ? content.slice(0, 20_000) : content,
            contentNote: truncated ? "Preview truncated." : undefined,
          });
        } catch {
          enriched.push({ ...entry, contentNote: "Unable to read file." });
        }
      }
      setItems(enriched);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load files",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, [skill.path]);

  async function handleOpen(entry: Entry) {
    if (entry.isDirectory) {
      await showInFinder(entry.path);
      return;
    }
    await openInEditor(entry.path, preferences.editorPreference);
  }

  async function handleDelete(entry: Entry) {
    const confirmed = await confirmAlert({
      title: `Delete ${entry.relativePath}?`,
      message: entry.isDirectory ? "This will remove the folder and its contents." : "This will remove the file.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    try {
      await trash(entry.path);
      await showToast({ style: Toast.Style.Success, title: "Entry deleted" });
      await loadEntries();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete entry",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleCopy(entry: Entry) {
    if (entry.isDirectory) {
      return;
    }

    try {
      const stat = await fs.stat(entry.path);
      if (stat.size > MAX_COPY_SIZE) {
        await showToast({
          style: Toast.Style.Failure,
          title: "File too large to copy",
        });
        return;
      }
      const buffer = await fs.readFile(entry.path);
      if (buffer.includes(0)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Binary files cannot be copied",
        });
        return;
      }
      await Clipboard.copy(buffer.toString("utf8"));
      await showToast({
        style: Toast.Style.Success,
        title: "File copied to clipboard",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy file",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search files" navigationTitle={skill.name} isShowingDetail>
      {items.length === 0 ? (
        <List.EmptyView
          title="No files found"
          description="Add a file or folder to this skill."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add File or Folder"
                icon={Icon.Plus}
                target={<SkillEntryForm skillPath={skill.path} onSaved={loadEntries} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        items.map((entry) => {
          const indent = entry.depth > 0 ? `${"│   ".repeat(entry.depth - 1)}├─ ` : "";
          const title = `${indent}${entry.name}`;
          const subtitle = entry.depth > 0 ? entry.relativePath : undefined;
          const language = entry.isDirectory ? "" : getLanguageHint(entry.path);
          const codeFence = language ? `\`\`\`${language}` : "```";
          const detailMarkdown = entry.isDirectory
            ? `# ${entry.name}\n\nFolder\n\n\`${entry.relativePath}\``
            : `# ${entry.name}\n\n\`${entry.relativePath}\`\n\n${entry.contentNote ?? ""}\n\n${codeFence}\n${entry.content ?? ""}\n\`\`\``;
          return (
            <List.Item
              key={entry.relativePath}
              title={title}
              subtitle={subtitle}
              icon={entry.isDirectory ? Icon.Folder : Icon.Document}
              detail={entry.isDirectory ? null : <List.Item.Detail markdown={detailMarkdown} />}
              actions={
                <ActionPanel>
                  {entry.isDirectory ? (
                    <Action title="Reveal in Finder" icon={Icon.Finder} onAction={() => showInFinder(entry.path)} />
                  ) : (
                    <>
                      <Action title="Open in Editor" icon={Icon.ArrowRight} onAction={() => handleOpen(entry)} />
                      <Action.Push
                        title="Edit File"
                        icon={Icon.Pencil}
                        target={
                          <SkillEntryForm
                            mode="edit"
                            skillPath={skill.path}
                            entryPath={entry.relativePath}
                            onSaved={loadEntries}
                          />
                        }
                      />
                      <Action title="Copy File" icon={Icon.Clipboard} onAction={() => handleCopy(entry)} />
                    </>
                  )}
                  <Action
                    title="Open Skill Folder in Editor"
                    icon={Icon.Folder}
                    onAction={() => openInEditor(skill.path, preferences.editorPreference)}
                  />
                  <Action.Push
                    title="Add File or Folder"
                    icon={Icon.Plus}
                    target={
                      <SkillEntryForm skillPath={entry.isDirectory ? entry.path : skill.path} onSaved={loadEntries} />
                    }
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(entry)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
