import { Action, ActionPanel, Clipboard, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { extractUrls, type ExtractedItem } from "./extractUrls";
import { openItems, type OpenResult } from "./openLinks";

// Non-web types render in this fixed order after the web hostnames
// (matches LD-P3-02 confirm-dialog ordering).
const NON_WEB_ORDER: ReadonlyArray<ExtractedItem["type"]> = ["local-path", "mailto", "custom-scheme", "file-ext"];

function itemId(item: ExtractedItem): string {
  // LD-P4-08: stable id handles dedupe collisions (same URL from different sources).
  return `${item.url}::${item.index}`;
}

function groupItems(items: ExtractedItem[]): Map<string, ExtractedItem[]> {
  const groups = new Map<string, ExtractedItem[]>();
  for (const item of items) {
    let key: string;
    if (item.type === "web") {
      try {
        key = new URL(item.url).hostname;
      } catch {
        key = "web";
      }
    } else {
      key = item.type;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

function orderedGroups(groups: Map<string, ExtractedItem[]>): Array<[string, ExtractedItem[]]> {
  // Web hostnames alphabetical first, then NON_WEB_ORDER in fixed order. Per LD-P4-07.
  const webKeys: string[] = [];
  const nonWebKeys: string[] = [];
  for (const key of groups.keys()) {
    if (NON_WEB_ORDER.includes(key as ExtractedItem["type"])) nonWebKeys.push(key);
    else webKeys.push(key);
  }
  webKeys.sort();
  nonWebKeys.sort(
    (a, b) => NON_WEB_ORDER.indexOf(a as ExtractedItem["type"]) - NON_WEB_ORDER.indexOf(b as ExtractedItem["type"]),
  );
  return [...webKeys, ...nonWebKeys].map((k) => [k, groups.get(k)!]);
}

function badgeForItem(item: ExtractedItem): string {
  if (item.type === "web") {
    try {
      return new URL(item.url).hostname;
    } catch {
      return "web";
    }
  }
  return item.type;
}

export default function FilterCommand() {
  // Three-state clipboard read: null = still loading, "" = empty, string = non-empty text.
  const [clipboard, setClipboard] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Clipboard.readText()
      .then((text) => {
        if (cancelled) return;
        setClipboard(text ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setClipboard("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = clipboard === null;
  // Memoize on the clipboard string so extraction only re-runs when it changes.
  const allItems = useMemo(() => (clipboard && clipboard.length > 0 ? extractUrls(clipboard) : []), [clipboard]);
  const groups = useMemo(() => orderedGroups(groupItems(allItems)), [allItems]);
  const selectedItemsList = useMemo(() => allItems.filter((i) => selected.has(itemId(i))), [allItems, selected]);

  function toggleSelect(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function openBatch(batch: ExtractedItem[]) {
    if (batch.length === 0) {
      await showToast({ title: "Nothing to open" });
      return;
    }
    const result: OpenResult = await openItems(batch, { source: "filter" });
    if (result.cancelled) return;
    if (result.total === 0) {
      await showToast({
        title: "Nothing to open",
        message: "Items were filtered out by current preferences",
      });
      return;
    }
    if (result.failed > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Opened ${result.opened} of ${result.total}`,
        message: "Some links failed (file missing or no app handler)",
      });
      return;
    }
    await showToast({
      title: `Opened ${result.total} link${result.total === 1 ? "" : "s"}`,
    });
  }

  async function copyOne(item: ExtractedItem) {
    await Clipboard.copy(item.url);
    await showToast({ title: "Copied URL" });
  }

  // LD-P4-11 empty states. (clipboard is narrowed to string here via !isLoading.)
  if (!isLoading && clipboard.length === 0) {
    return (
      <List searchBarPlaceholder="Filter extracted links">
        <List.EmptyView
          icon={Icon.Clipboard}
          title="Clipboard is empty"
          description="Paste URL-containing text into your clipboard, then re-run."
        />
      </List>
    );
  }

  if (!isLoading && allItems.length === 0) {
    return (
      <List searchBarPlaceholder="Filter extracted links">
        <List.EmptyView
          icon={Icon.Globe}
          title="No URLs found"
          description="The clipboard text didn't contain any recognizable links."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter extracted links">
      {groups.map(([key, groupItemsArr]) => (
        <List.Section
          key={key}
          title={key}
          subtitle={`${groupItemsArr.length} item${groupItemsArr.length === 1 ? "" : "s"}`}
        >
          {groupItemsArr.map((item) => {
            const id = itemId(item);
            const isSelected = selected.has(id);

            const accessories: List.Item.Accessory[] = [];
            if (isSelected) accessories.push({ icon: Icon.CheckCircle, tooltip: "Selected" });
            accessories.push({ tag: badgeForItem(item) });

            return (
              <List.Item
                key={id}
                icon={item.type === "web" ? Icon.Globe : Icon.Document}
                title={item.raw}
                subtitle={item.url !== item.raw ? item.url : undefined}
                keywords={[item.url, item.raw, badgeForItem(item)]}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action title="Open This Item" icon={Icon.Globe} onAction={() => openBatch([item])} />
                    {selected.size > 0 && (
                      <Action
                        title={`Open Selected (${selected.size})`}
                        icon={Icon.Globe}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                        onAction={() => openBatch(selectedItemsList)}
                      />
                    )}
                    <Action
                      title="Open All in Group"
                      icon={Icon.Globe}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      onAction={() => openBatch(groupItemsArr)}
                    />
                    <Action
                      title="Open All"
                      icon={Icon.Globe}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      onAction={() => openBatch(allItems)}
                    />
                    <Action
                      title="Toggle Selection"
                      icon={Icon.CircleProgress100}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => toggleSelect(id)}
                    />
                    <Action
                      title="Copy URL"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={() => copyOne(item)}
                    />
                    <Action
                      title="Open Extension Preferences"
                      icon={Icon.Gear}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                      onAction={openExtensionPreferences}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
