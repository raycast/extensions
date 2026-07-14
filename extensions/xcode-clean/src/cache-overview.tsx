import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  CACHES,
  CacheCategory,
  CacheEntry,
  cleanCache,
  cleanCaches,
  formatBytes,
  getCacheSize,
} from "./lib/cache";
import { confirmIfNeeded } from "./lib/confirm";
import { formatError } from "./lib/error";
import CleanInfo from "./components/CleanInfo";

type Row = { cache: CacheEntry; size: number };

const ALL_CACHES = Object.values(CACHES) as CacheEntry[];
const CATEGORIES: CacheCategory[] = ["Xcode", "Kotlin / Gradle"];

export default function Command() {
  const [rows, setRows] = useState<Row[]>(
    ALL_CACHES.map((c) => ({ cache: c, size: 0 })),
  );
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const updated = await Promise.all(
      ALL_CACHES.map(async (c) => ({ cache: c, size: await getCacheSize(c) })),
    );
    setRows(updated);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function cleanOne(cache: CacheEntry, size: number) {
    const ok = await confirmIfNeeded(
      `Delete ${cache.name} (${formatBytes(size)})?`,
    );
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Cleaning ${cache.name}…`,
    });
    try {
      await cleanCache(cache);
      toast.style = Toast.Style.Success;
      toast.title = `Cleaned ${formatBytes(size)}`;
      await refresh();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = formatError(e);
    }
  }

  async function cleanAll() {
    const total = rows.reduce((s, r) => s + r.size, 0);
    if (total === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Nothing to clean",
      });
      return;
    }
    // Note: this always deletes every cache in both categories, regardless of
    // the current search filter (Raycast filters the list visually but not the
    // underlying `rows`), so the wording says so explicitly.
    const ok = await confirmIfNeeded(
      `Delete all ${rows.length} caches across every category (not just the ones shown)? Total: ${formatBytes(total)}.`,
      "Clean All Caches",
    );
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Cleaning…",
    });
    try {
      await cleanCaches(rows.map((r) => r.cache));
      toast.style = Toast.Style.Success;
      toast.title = `Cleaned ${formatBytes(total)}`;
      await refresh();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = formatError(e);
    }
  }

  function renderRow({ cache, size }: Row) {
    return (
      <List.Item
        key={cache.id}
        icon={{
          source: Icon.HardDrive,
          tintColor: size > 0 ? Color.Orange : Color.SecondaryText,
        }}
        title={cache.name}
        subtitle={cache.description}
        accessories={[{ text: loading ? "…" : formatBytes(size) }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Info"
              icon={Icon.Info}
              target={
                <CleanInfo
                  title={cache.name}
                  description={cache.info}
                  caches={[cache]}
                />
              }
            />
            <Action
              title="Clean"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "delete" }}
              onAction={() => cleanOne(cache, size)}
            />
            <Action
              title="Refresh Sizes"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={refresh}
            />
            <Action
              title="Clean All Caches"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              onAction={cleanAll}
            />
          </ActionPanel>
        }
      />
    );
  }

  const total = rows.reduce((s, r) => s + r.size, 0);

  return (
    <List
      isLoading={loading}
      navigationTitle={`All Caches (${formatBytes(total)})`}
      searchBarPlaceholder="Search caches…"
    >
      {CATEGORIES.map((category) => {
        const inCategory = rows.filter((r) => r.cache.category === category);
        const sectionTotal = inCategory.reduce((s, r) => s + r.size, 0);
        return (
          <List.Section
            key={category}
            title={category}
            subtitle={loading ? "…" : formatBytes(sectionTotal)}
          >
            {inCategory.map(renderRow)}
          </List.Section>
        );
      })}
    </List>
  );
}
