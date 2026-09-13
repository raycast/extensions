import {
  Action,
  Clipboard,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useCallback, useMemo, useState } from "react";
import {
  EntryListView,
  EntrySection,
  ViewContext,
} from "./components/entry-views";
import { docsBase } from "./lib/constants";
import {
  gradleKotlinDsl,
  mavenXml,
  resolveArtifactVersion,
} from "./lib/dependency";
import {
  clearDetailsCache,
  documentationPages,
  prefetchPages,
} from "./lib/docpage";
import { isFaqEntry, loadGuides, refreshGuides } from "./lib/guides";
import { loadInventory, refreshInventory } from "./lib/inventory";
import { ensureMeta } from "./lib/metadata";
import { getPreferences } from "./lib/preferences";
import { describeFilters, parseQuery } from "./lib/query";
import { browseEntries, searchEntries } from "./lib/search";
import { DocEntry, SECTIONS, SectionId } from "./lib/types";

const RECENT_LIMIT = 8;

export default function SearchDocumentation() {
  const { primaryAction, includeGuides, docsVersion } = getPreferences();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<SectionId | "all">("all");

  const {
    data: inventory,
    isLoading,
    revalidate,
  } = usePromise(loadInventory, [docsVersion], {
    failureToastOptions: {
      title: "Could not load the Folia Javadoc index",
    },
  });

  const documented = useMemo(() => inventory?.entries ?? [], [inventory]);

  const { data: guides, revalidate: revalidateGuides } = usePromise(
    async () => (includeGuides ? loadGuides() : []),
    [],
    { execute: documented.length > 0 },
  );

  const entries = useMemo(
    () => [...documented, ...(guides ?? [])],
    [documented, guides],
  );

  const { data: meta, revalidate: revalidateMeta } = usePromise(
    async (docs: DocEntry[], version: string) => ensureMeta(docs, version),
    [documented, docsVersion],
    { execute: documented.length > 0 },
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
    const isDeprecated = (entry: DocEntry): boolean =>
      Boolean(meta?.[entry.name]?.deprecated);

    let scope =
      section === "all"
        ? entries
        : entries.filter((entry) => entry.section === section);

    if (parsed.faqOnly) scope = scope.filter(isFaqEntry);
    if (parsed.kind)
      scope = scope.filter((entry) => entry.kind === parsed.kind);
    if (parsed.section)
      scope = scope.filter((entry) => entry.section === parsed.section);
    if (parsed.pkg) {
      scope = scope.filter((entry) =>
        entry.pkg.toLowerCase().includes(parsed.pkg ?? ""),
      );
    }

    const filterLabel = describeFilters(parsed);
    const subtitle =
      [filterLabel, `Folia ${docsVersion}`].filter(Boolean).join(" · ") ||
      undefined;

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
        {
          title: "Results",
          subtitle,
          entries: browseEntries(scope, true, isDeprecated),
        },
      ];
    }

    const wanted = new Set([...(favorites ?? []), ...(recents ?? [])]);
    const found = new Map<string, DocEntry>();
    if (wanted.size > 0) {
      for (const entry of scope) {
        if (wanted.has(entry.name) && !found.has(entry.name))
          found.set(entry.name, entry);
      }
    }

    const pick = (names: string[]): DocEntry[] =>
      names
        .map((name) => found.get(name))
        .filter((entry): entry is DocEntry => Boolean(entry));

    const pinned = pick(favorites ?? []);
    const recent = pick(recents ?? []).filter(
      (entry) => !pinned.includes(entry),
    );
    const browsed = browseEntries(
      scope,
      section !== "all",
      isDeprecated,
    ).filter((entry) => !pinned.includes(entry) && !recent.includes(entry));

    return [
      { title: "Favorites", entries: pinned },
      { title: "Recent", entries: recent },
      {
        title:
          section === "all"
            ? "Types and Guides"
            : (SECTIONS.find((item) => item.id === section)?.title ?? "All"),
        subtitle,
        entries: browsed,
      },
    ].filter((item) => item.entries.length > 0);
  }, [entries, section, query, favorites, recents, docsVersion, meta]);

  async function refresh() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing documentation index",
    });
    try {
      const refreshed = await refreshInventory(docsVersion);
      if (includeGuides) await refreshGuides();
      await ensureMeta(refreshed.entries, docsVersion, true);
      await clearDetailsCache();
      await revalidate();
      await revalidateGuides();
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
      const failed = await prefetchPages(pages, (done, total) => {
        toast.message = `${done} of ${total} pages`;
      });
      toast.style = Toast.Style.Success;
      toast.title = `Cached ${pages.length - failed} pages for offline use`;
      toast.message = failed
        ? `${failed} pages could not be downloaded`
        : undefined;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Offline download failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function copyDependency(
    format: (version: string) => string,
    label: string,
  ) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Resolving folia-api version`,
    });
    try {
      const version = await resolveArtifactVersion(docsVersion);
      await Clipboard.copy(format(version));
      toast.style = Toast.Style.Success;
      toast.title = `Copied ${label}`;
      toast.message = `dev.folia:folia-api:${version}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not resolve the folia-api version";
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
      searchBarPlaceholder="Search Folia — getScheduler, PlayerJoinEvent, @event, section:scheduler, faq: token…"
      emptyTitle={
        query ? "No matching entries" : "Search the Folia documentation"
      }
      emptyDescription={
        query
          ? "Try a type name such as Player, GlobalRegionScheduler, EntityScheduler or PlayerJoinEvent."
          : undefined
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
          <Action.OpenInBrowser
            title="Open Documentation"
            url={docsBase(docsVersion)}
          />
          <Action
            title="Copy Gradle Kotlin Dependency"
            icon={Icon.Hammer}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
            onAction={() =>
              copyDependency(gradleKotlinDsl, "Gradle dependency")
            }
          />
          <Action
            title="Copy Maven Dependency"
            icon={Icon.Hammer}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            onAction={() => copyDependency(mavenXml, "Maven dependency")}
          />
        </>
      }
    />
  );
}
