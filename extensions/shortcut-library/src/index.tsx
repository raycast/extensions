import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Keyboard,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { writeFileSync } from "fs";
import { homedir, platform } from "os";
import { join } from "path";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { distinctCategories, generateId, loadShortcuts, saveShortcuts } from "./data";
import { ShortcutForm } from "./form-shortcut";
import { ImportForm } from "./import";
import DiscoverShortcuts from "./discover-shortcuts";
import { UNCATEGORIZED } from "./types";
import type { Shortcut } from "./types";

export default function Command() {
  const [filter, setFilter] = useState<string>("all");
  const { isLoading, data: shortcutsData, revalidate } = usePromise(loadShortcuts);
  const shortcuts = shortcutsData ?? [];

  const categories = distinctCategories(shortcuts);
  const tagOptions = collectTags(shortcuts);
  const tagColors = buildTagColors(shortcuts);

  const reload = revalidate;
  const isMac = platform() === "darwin";

  const visible =
    filter === "all"
      ? shortcuts
      : filter.startsWith("cat:")
        ? shortcuts.filter((s) => s.category === filter.slice(4))
        : shortcuts.filter((s) => (s.tags ?? []).includes(filter.slice(4)));

  const filterDropdown = (
    <List.Dropdown tooltip="Filter by category or tag" value={filter} onChange={setFilter}>
      <List.Dropdown.Item key="all" value="all" title="All shortcuts" />
      {categories.length > 0 && (
        <List.Dropdown.Section title="Categories">
          {categories.map((c) => (
            <List.Dropdown.Item key={`cat:${c}`} value={`cat:${c}`} title={c} />
          ))}
        </List.Dropdown.Section>
      )}
      {tagOptions.length > 0 && (
        <List.Dropdown.Section title="Tags">
          {tagOptions.map((t) => (
            <List.Dropdown.Item key={`tag:${t}`} value={`tag:${t}`} title={t} />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );

  const grouped = groupByCategory(visible);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search shortcuts... (keys, title, or tag)"
      searchBarAccessory={filterDropdown}
    >
      {isLoading && !shortcutsData ? null : shortcuts.length === 0 ? (
        <List.EmptyView
          title="No shortcuts yet"
          description="Add your first custom shortcut"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Shortcut"
                shortcut={Keyboard.Shortcut.Common.New}
                target={<ShortcutForm mutate={reload} />}
              />
              <Action.Push title="Import from JSON…" target={<ImportForm mutate={reload} />} />
              {isMac && <Action.Push title="Discover Shortcuts" target={<DiscoverShortcuts />} />}
            </ActionPanel>
          }
        />
      ) : (
        <>
          {grouped.map(({ category, items }) => (
            <List.Section key={category} title={category} subtitle={`${items.length}`}>
              {items.map((s) => {
                return (
                  <List.Item
                    key={s.id}
                    title={s.title}
                    keywords={[s.keys, s.title, s.category ?? "", ...(s.tags ?? [])]}
                    accessories={[
                      ...tagAccessories(s, tagColors),
                      { text: { value: s.keys, color: Color.SecondaryText } },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Add Shortcut"
                          shortcut={Keyboard.Shortcut.Common.New}
                          target={<ShortcutForm mutate={reload} />}
                        />
                        <Action.Push
                          title="Edit Shortcut"
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          target={<ShortcutForm existing={s} mutate={reload} />}
                        />
                        <Action title="Duplicate Shortcut" onAction={() => duplicateShortcut(s, reload)} />
                        <Action
                          title="Delete Shortcut"
                          shortcut={{
                            macOS: { key: "x", modifiers: ["ctrl"] },
                            Windows: { key: "delete", modifiers: ["shift"] },
                          }}
                          style={Action.Style.Destructive}
                          onAction={() => deleteShortcut(s.id, s.title, reload)}
                        />
                        <ActionPanel.Section>
                          {isMac && <Action.Push title="Discover Shortcuts" target={<DiscoverShortcuts />} />}
                          <Action.Push title="Import from JSON…" target={<ImportForm mutate={reload} />} />
                          <Action.CopyToClipboard title="Copy All as Markdown" content={toMarkdown(shortcuts)} />
                          <Action title="Export to ~/Downloads" onAction={() => exportToDownloads(shortcuts)} />
                          <Action
                            title="Delete All Shortcuts"
                            style={Action.Style.Destructive}
                            onAction={() => deleteAllShortcuts(reload)}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          ))}
          <List.Item
            title="＋ Add Shortcut"
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Shortcut"
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<ShortcutForm mutate={reload} />}
                />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}

function collectTags(items: Shortcut[]): string[] {
  const set = new Set<string>();
  for (const s of items) for (const t of s.tags ?? []) set.add(t);
  return [...set].sort();
}

function groupByCategory(items: Shortcut[]): { category: string; items: Shortcut[] }[] {
  const map = new Map<string, Shortcut[]>();
  for (const s of items) {
    const cat = s.category ?? UNCATEGORIZED;
    const list = map.get(cat);
    if (list) list.push(s);
    else map.set(cat, [s]);
  }
  return [...map.entries()].map(([category, list]) => ({ category, items: list }));
}

const TAG_PASTELS: string[] = ["#f6c6d0", "#f9d3a3", "#b5e0b5", "#a9cfec", "#d6c3ec", "#f2b8b0", "#bcd9d8"];

function buildTagColors(items: Shortcut[]): Map<string, string> {
  const tags = [...new Set(items.flatMap((s) => s.tags ?? []))].sort();
  const map = new Map<string, string>();
  tags.forEach((t, i) => map.set(t, TAG_PASTELS[i % TAG_PASTELS.length]));
  return map;
}

function tagAccessories(s: Shortcut, colors: Map<string, string>): { tag: { value: string; color: string } }[] {
  return (s.tags ?? []).map((t) => ({ tag: { value: t, color: colors.get(t) ?? TAG_PASTELS[0] } }));
}

async function duplicateShortcut(s: Shortcut, reload: () => void) {
  const items = await loadShortcuts();
  items.push({ ...s, id: generateId(), source: undefined, sourceFile: undefined });
  await saveShortcuts(items);
  reload();
  showToast({ style: Toast.Style.Success, title: `Duplicated ${s.title}` });
}

async function deleteShortcut(id: string, title: string, reload: () => void) {
  const confirmed = await confirmAlert({
    title: `Delete "${title}"?`,
    message: "This cannot be undone.",
    primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
  });
  if (!confirmed) return;
  const items = await loadShortcuts();
  const idx = items.findIndex((s) => s.id === id);
  if (idx >= 0) items.splice(idx, 1);
  await saveShortcuts(items);
  reload();
  showToast({ style: Toast.Style.Success, title: "Shortcut deleted" });
}

async function deleteAllShortcuts(reload: () => void) {
  const confirmed = await confirmAlert({
    title: "Delete all shortcuts?",
    message: "This cannot be undone.",
    primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete All" },
  });
  if (!confirmed) return;
  await saveShortcuts([]);
  reload();
  showToast({ style: Toast.Style.Success, title: "All shortcuts deleted" });
}

async function exportToDownloads(items: Shortcut[]) {
  const path = join(homedir(), "Downloads", `shortcuts-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(path, JSON.stringify(items, null, 2), "utf8");
  await Clipboard.copy(JSON.stringify(items, null, 2));
  showHUD(`Exported ${items.length} shortcuts to ${path}`);
}

function toMarkdown(items: Shortcut[]): string {
  if (items.length === 0) return "No shortcuts.";
  return items
    .map((s) => {
      const bits = [s.category ?? UNCATEGORIZED, ...(s.tags ?? [])];
      const suffix = bits.length > 0 ? ` _(${bits.join(", ")})_` : "";
      return `- **${s.title}**: \`${s.keys}\`${suffix}`;
    })
    .join("\n");
}
