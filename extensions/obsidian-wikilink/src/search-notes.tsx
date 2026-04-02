import { Action, ActionPanel, Clipboard, List, getPreferenceValues } from "@raycast/api";
import { readdirSync, statSync } from "fs";
import { join, basename, relative } from "path";
import { homedir } from "os";

function resolveVaultPath(raw: string): string {
  return raw.startsWith("~/") ? join(homedir(), raw.slice(2)) : raw;
}

const { vaultPath, useFullPath } = getPreferenceValues<Preferences>();
const VAULT = resolveVaultPath(vaultPath);
const EXCLUDED = new Set([".trash", ".smart-env", "Templates"]);

function getMarkdownFiles(dir: string, files: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.startsWith(".") || EXCLUDED.has(entry)) continue;
    const full = join(dir, entry);
    try {
      if (statSync(full).isDirectory()) {
        getMarkdownFiles(full, files);
      } else if (entry.endsWith(".md")) {
        files.push(full);
      }
    } catch {
      // skip broken symlinks, permission errors, etc.
    }
  }
  return files;
}

export default function Command() {
  const files = getMarkdownFiles(VAULT);

  const items = files.map((file) => {
    const rel = relative(VAULT, file).replace(/\.md$/, "");
    const name = basename(rel);
    const folder = rel.includes("/") ? rel.split("/").slice(0, -1).join("/") : "";
    return { file, rel, name, folder };
  });

  return (
    <List searchBarPlaceholder="Search notes...">
      {items.map(({ file, rel, name, folder }) => (
        <List.Item
          key={file}
          title={name}
          subtitle={folder}
          actions={
            <ActionPanel>
              <Action
                title="Paste Wikilink"
                onAction={() => Clipboard.paste(`[[${useFullPath ? rel : name}]]`)}
              />
              <Action
                title={useFullPath ? "Paste Wikilink (Name Only)" : "Paste Wikilink with Path"}
                onAction={() => Clipboard.paste(`[[${useFullPath ? name : rel}]]`)}
              />
              <Action
                title="Copy Wikilink"
                onAction={() => Clipboard.copy(`[[${useFullPath ? rel : name}]]`)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
