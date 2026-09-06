import { Action, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useCallback, useMemo, useState } from "react";
import {
  EntryListView,
  EntrySection,
  ViewContext,
} from "./components/entry-views";
import { docsBase } from "./lib/constants";
import {
  clearDetailsCache,
  documentationPages,
  prefetchPages,
} from "./lib/docpage";
import { isFaqEntry, loadFaq } from "./lib/faq";
import { loadInventory, refreshInventory } from "./lib/inventory";
import { ensureMeta } from "./lib/metadata";
import { getPreferences } from "./lib/preferences";
import { describeFilters, parseQuery } from "./lib/query";
import { browseEntries, searchEntries } from "./lib/search";
import { DocEntry, SECTIONS, SectionId } from "./lib/types";

const RECENT_LIMIT = 8;

export default function SearchDocumentation() {
  const { primaryAction } = getPreferences();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<SectionId | "all">("all");

  const {
    data: inventory,
    isLoading,
    revalidate,
  } = usePromise(loadInventory, [], {
    failureToastOptions: {
      title: "Could not load the discord.py documentation index",
    },
  });

  const documented = useMemo(() => inventory?.entries ?? [], [inventory]);

  const { data: faq } = usePromise(loadFaq, [], {
    execute: documented.length > 0,
  });

  const entries = useMemo(
    () => [...documented, ...(faq ?? [])],
    [documented, faq],
  );

  const { data: meta, revalidate: revalidateMeta } = usePromise(
    ensureMeta,
    [documented],
    {
      execute: documented.length > 0,
    },
  );

  const { value: favorites, setValue: setFavorites } = useLocalStorage<
    string[]
  >("favorites", []);
  const { value: recents, setValue: setRecents } = useLocalStorage<string[]>(
    "recents",
    [],
  );
  const { value: showDetail, setValue: setShowDetail } =
    useLocalStorage<boolean>("show-detail", false);

  const toggleFavorite = useCallback(
    (name: string) => {
      const current = favorites ?? [];
      setFavorites(
        current.includes(name)
          ? current.filter((item) => item !== name)
          : [name, ...current],
      );
    },
    [favorites, setFavorites],
  );

  const addRecent = useCallback(
    (name: string) => {
      const current = recents ?? [];
      setRecents(
        [name, ...current.filter((item) => item !== name)].slice(
          0,
          RECENT_LIMIT,
        ),
      );
    },
    [recents, setRecents],
  );

  const ctx: ViewContext = useMemo(
    () => ({
      entries,
      meta: meta ?? {},
      favorites: favorites ?? [],
      toggleFavorite,
      addRecent,
      primaryAction,
      showDetail: showDetail ?? false,
      toggleDetail: () => setShowDetail(!showDetail),
    }),
    [
      entries,
      meta,
      favorites,
      toggleFavorite,
      addRecent,
      primaryAction,
      showDetail,
      setShowDetail,
    ],
  );

  const sections = useMemo<EntrySection[]>(() => {
    const parsed = parseQuery(query);
    const badges = meta ?? {};

    let scope =
      section === "all"
        ? entries
        : entries.filter((entry) => entry.section === section);

    if (parsed.faqOnly) scope = scope.filter(isFaqEntry);
    if (parsed.kind)
      scope = scope.filter((entry) => entry.kind === parsed.kind);
    if (parsed.section)
      scope = scope.filter((entry) => entry.section === parsed.section);
    if (parsed.module) {
      scope = scope.filter((entry) =>
        entry.module.toLowerCase().includes(parsed.module ?? ""),
      );
    }
    if (parsed.intent) {
      scope = scope.filter((entry) =>
        badges[entry.anchor]?.intents?.some((intent) =>
          intent.includes(parsed.intent ?? ""),
        ),
      );
    }

    const filterLabel = describeFilters(parsed);
    const version = inventory ? `discord.py ${inventory.version}` : undefined;
    const subtitle =
      [filterLabel, version].filter(Boolean).join(" · ") || undefined;

    if (parsed.text.trim()) {
      return [
        {
          title: "Results",
          subtitle,
          entries: searchEntries(scope, parsed.text),
        },
      ];
    }
    if (filterLabel) {
      return [
        { title: "Results", subtitle, entries: browseEntries(scope, true) },
      ];
    }

    const pick = (names: string[]): DocEntry[] =>
      names
        .map((name) => scope.find((entry) => entry.name === name))
        .filter((entry): entry is DocEntry => Boolean(entry));

    const pinned = pick(favorites ?? []);
    const recent = pick(recents ?? []).filter(
      (entry) => !pinned.includes(entry),
    );
    const browsed = browseEntries(scope, section !== "all").filter(
      (entry) => !pinned.includes(entry) && !recent.includes(entry),
    );

    return [
      { title: "Favorites", entries: pinned },
      { title: "Recent", entries: recent },
      {
        title:
          section === "all"
            ? "Classes and Guides"
            : (SECTIONS.find((item) => item.id === section)?.title ?? "All"),
        subtitle,
        entries: browsed,
      },
    ].filter((item) => item.entries.length > 0);
  }, [entries, section, query, favorites, recents, inventory, meta]);

  async function refresh() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing documentation index",
    });
    try {
      clearDetailsCache();
      const refreshed = await refreshInventory();
      await ensureMeta(refreshed.entries, true);
      await revalidate();
      await revalidateMeta();
      toast.style = Toast.Style.Success;
      toast.title = "Documentation index refreshed";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Refresh failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function prefetch() {
    const pages = documentationPages(entries);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading documentation for offline use",
    });
    try {
      await prefetchPages(pages, (done, total) => {
        toast.message = `${done} of ${total} pages`;
      });
      toast.style = Toast.Style.Success;
      toast.title = `Cached ${pages.length} pages for offline use`;
      toast.message = undefined;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Offline download failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <EntryListView
      ctx={ctx}
      sections={sections}
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search discord.py — wait_for, @event, intent:members, faq: commands…"
      emptyTitle={
        query ? "No matching entries" : "Search the discord.py documentation"
      }
      emptyDescription={
        query ? "Try a class name such as Client, Embed or Guild." : undefined
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by section"
          value={section}
          onChange={(value) => setSection(value as SectionId)}
        >
          {SECTIONS.map((item) => (
            <List.Dropdown.Item
              key={item.id}
              title={item.title}
              value={item.id}
            />
          ))}
        </List.Dropdown>
      }
      extraActions={
        <>
          <Action
            title="Refresh Index"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
          <Action
            title="Prefetch All Docs for Offline Use"
            icon={Icon.HardDrive}
            onAction={prefetch}
          />
          <Action.OpenInBrowser title="Open Documentation" url={docsBase()} />
        </>
      }
    />
  );
}
