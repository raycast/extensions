import {
  List,
  ActionPanel,
  Action,
  Icon,
  environment,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  Clipboard,
  open,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import fs from "node:fs";
import path from "node:path";
import { FMItem, SearchIndex } from "./types";
import { CATEGORY_PAGES } from "./constants";
import {
  fetchLatestCommitSha,
  fetchRawFileContent,
  fetchCommitCompareDiffs,
} from "./github";
import { parseMarkdownFile } from "./parser";

const INDEX_FILE = "fmhy-index.json";
const RECENT_OPENED_KEY = "recently-opened-v1";

// Map short search prefixes to main category IDs
const PREFIX_MAP: Record<string, string> = {
  ai: "ai",
  g: "gaming",
  gaming: "gaming",
  v: "video",
  video: "video",
  movie: "video",
  movies: "video",
  p: "privacy",
  privacy: "privacy",
  ad: "privacy",
  a: "audio",
  audio: "audio",
  music: "audio",
  d: "downloading",
  downloading: "downloading",
  t: "torrenting",
  torrent: "torrenting",
  torrenting: "torrenting",
  e: "educational",
  edu: "educational",
  educational: "educational",
  m: "mobile",
  mobile: "mobile",
  l: "linux-macos",
  linux: "linux-macos",
  mac: "linux-macos",
};

export default function Command() {
  const [items, setItems] = useState<FMItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [recentlyOpenedIds, setRecentlyOpenedIds] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<string>("");

  const preferences = getPreferenceValues<Preferences>();
  const indexPath = path.join(environment.supportPath, INDEX_FILE);

  // Ensure support directory exists
  const ensureSupportDir = () => {
    if (!fs.existsSync(environment.supportPath)) {
      fs.mkdirSync(environment.supportPath, { recursive: true });
    }
  };

  // Perform a full initial sync of all categories
  const performFullSync = async (latestSha: string) => {
    setIsLoading(true);
    ensureSupportDir();

    const allItems: FMItem[] = [];
    const total = CATEGORY_PAGES.length;

    for (let i = 0; i < total; i++) {
      const page = CATEGORY_PAGES[i];
      setSyncStatus(`Downloading ${page.name} (${i + 1}/${total})...`);

      try {
        const content = await fetchRawFileContent(page.path);
        const parsed = parseMarkdownFile(content, page.category);
        allItems.push(...parsed);
      } catch (error) {
        console.error(`Error syncing ${page.name}:`, error);
      }
    }

    const indexData: SearchIndex = {
      commitSha: latestSha,
      syncedAt: new Date().toISOString(),
      items: allItems,
    };

    await fs.promises.writeFile(indexPath, JSON.stringify(indexData));
    setItems(allItems);
    setIsLoading(false);
    setSyncStatus("");

    await showToast({
      style: Toast.Style.Success,
      title: "Index Synced",
      message: `Loaded ${allItems.length} resources from FMHY`,
    });
  };

  // Perform a background diff-based update check
  const checkAndSyncDiffs = async (cachedIndex: SearchIndex) => {
    try {
      const latestSha = await fetchLatestCommitSha();
      if (cachedIndex.commitSha === latestSha) {
        // Already up to date!
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Checking for updates...",
      });

      const diffs = await fetchCommitCompareDiffs(
        cachedIndex.commitSha,
        latestSha,
      );
      const docsDiffs = diffs.filter(
        (d) => d.filename.startsWith("docs/") && d.filename.endsWith(".md"),
      );

      if (docsDiffs.length === 0) {
        // No relevant changes in documentation folder
        // Just update cached commit sha
        const updatedIndex: SearchIndex = {
          ...cachedIndex,
          commitSha: latestSha,
          syncedAt: new Date().toISOString(),
        };
        await fs.promises.writeFile(indexPath, JSON.stringify(updatedIndex));
        toast.style = Toast.Style.Success;
        toast.title = "Search index up to date";
        return;
      }

      toast.title = `Syncing changes (${docsDiffs.length} files)...`;

      // Copy existing items
      let updatedItems = [...cachedIndex.items];

      for (const diff of docsDiffs) {
        const filename = diff.filename.replace("docs/", "");
        const categoryPage = CATEGORY_PAGES.find((p) => p.path === filename);
        const category = categoryPage
          ? categoryPage.category
          : filename.replace(".md", "");

        // If renamed, also remove the items of the previous filename/category
        if (diff.status === "renamed" && diff.previous_filename) {
          const prevFilename = diff.previous_filename.replace("docs/", "");
          const prevCategoryPage = CATEGORY_PAGES.find(
            (p) => p.path === prevFilename,
          );
          const prevCategory = prevCategoryPage
            ? prevCategoryPage.category
            : prevFilename.replace(".md", "");
          updatedItems = updatedItems.filter(
            (item) => item.category !== prevCategory,
          );
        }

        // Remove old items for this category
        updatedItems = updatedItems.filter(
          (item) => item.category !== category,
        );

        if (diff.status !== "removed") {
          try {
            const rawContent = await fetchRawFileContent(filename);
            const parsed = parseMarkdownFile(rawContent, category);
            updatedItems.push(...parsed);
          } catch (e) {
            console.error(`Error updating category ${category}:`, e);
          }
        }
      }

      const newIndex: SearchIndex = {
        commitSha: latestSha,
        syncedAt: new Date().toISOString(),
        items: updatedItems,
      };

      await fs.promises.writeFile(indexPath, JSON.stringify(newIndex));
      setItems(updatedItems);
      toast.style = Toast.Style.Success;
      toast.title = "FMHY Index updated!";
      toast.message = `Sync completed. Loaded ${updatedItems.length} resources.`;
    } catch (error) {
      console.error("Diff sync error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Sync failed",
        message: "Failed to update index in background",
      });
    }
  };

  // Track user visits to save in Favorites / Recently Opened
  const trackVisit = async (item: FMItem) => {
    try {
      const stored = await LocalStorage.getItem<string>(RECENT_OPENED_KEY);
      let list: string[] = [];
      if (stored) {
        list = JSON.parse(stored) as string[];
      }

      // Add to head of array and filter duplicates
      const newList = [item.id, ...list.filter((id) => id !== item.id)].slice(
        0,
        10,
      );
      await LocalStorage.setItem(RECENT_OPENED_KEY, JSON.stringify(newList));
      setRecentlyOpenedIds(newList);
    } catch (e) {
      console.error("Failed to save recently opened item:", e);
    }
  };

  // Load index and recently opened on mount
  useEffect(() => {
    const initData = async () => {
      try {
        // Load favorites/recent
        const storedRecent =
          await LocalStorage.getItem<string>(RECENT_OPENED_KEY);
        if (storedRecent) {
          setRecentlyOpenedIds(JSON.parse(storedRecent) as string[]);
        }

        if (fs.existsSync(indexPath)) {
          const content = await fs.promises.readFile(indexPath, "utf-8");
          const indexData = JSON.parse(content) as SearchIndex;
          setItems(indexData.items);
          setIsLoading(false);
          // Check for updates in the background
          checkAndSyncDiffs(indexData);
        } else {
          // No index exists, perform full sync
          const latestSha = await fetchLatestCommitSha();
          await performFullSync(latestSha);
        }
      } catch (error) {
        console.error("Failed to initialize FMHY index:", error);
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load index",
          message: "Check your internet connection and try again.",
        });
      }
    };

    initData();
  }, []);

  // Force manual rebuild of index
  const handleForceSync = async () => {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Refreshing index...",
      });
      const latestSha = await fetchLatestCommitSha();
      await performFullSync(latestSha);
      toast.style = Toast.Style.Success;
      toast.title = "Index refreshed!";
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Refresh failed",
        message: "Failed to perform a force sync.",
      });
    }
  };

  // Clear recently opened favorites list
  const handleClearRecent = async () => {
    await LocalStorage.removeItem(RECENT_OPENED_KEY);
    setRecentlyOpenedIds([]);
    await showToast({
      style: Toast.Style.Success,
      title: "History cleared",
    });
  };

  // Parse search prefix (e.g. "ai: image" or "/ai image")
  const parsedSearch = useMemo(() => {
    const trimmed = searchText.trim();

    // Check for slash prefix: /ai generation
    if (trimmed.startsWith("/")) {
      const slashRegex = /^\/([a-zA-Z0-9-]+)(?:\s+(.*))?$/;
      const match = trimmed.match(slashRegex);
      if (match) {
        const rawPrefix = match[1].toLowerCase();
        const query = match[2] || "";
        const categoryId = PREFIX_MAP[rawPrefix];
        if (categoryId) {
          return {
            categoryOverride: categoryId,
            query: query,
          };
        }
      }
    }

    // Check for colon prefix: ai: generation
    const colonRegex = /^([a-zA-Z0-9-]+):\s*(.*)$/;
    const match = trimmed.match(colonRegex);
    if (match) {
      const rawPrefix = match[1].toLowerCase();
      const query = match[2];
      const categoryId = PREFIX_MAP[rawPrefix];
      if (categoryId) {
        return {
          categoryOverride: categoryId,
          query: query,
        };
      }
    }

    return {
      categoryOverride: null,
      query: trimmed,
    };
  }, [searchText]);

  // Filter and sort items based on input, category dropdown, and NSFW preference
  const filteredItems = useMemo(() => {
    let result = items;
    const { categoryOverride, query } = parsedSearch;

    // Filter out NSFW content if not allowed
    if (!preferences.showNsfw) {
      result = result.filter(
        (item) =>
          item.category !== "nsfw" &&
          !item.subcategory.toLowerCase().includes("nsfw") &&
          !item.section.toLowerCase().includes("nsfw") &&
          !item.title.toLowerCase().includes("nsfw"),
      );
    }

    // Determine category filter
    const activeCategory = categoryOverride || selectedCategory;
    if (activeCategory !== "all" && activeCategory !== "starred-picks") {
      result = result.filter((item) => item.category === activeCategory);
    } else if (activeCategory === "starred-picks") {
      result = result.filter((item) => item.starred);
    }

    if (query) {
      const q = query.toLowerCase();

      // Precompute scores and match flags once per item to avoid repeated toLowerCase() inside sort loops
      const decorated = result.map((item) => {
        const title = item.title.toLowerCase();
        const sub = item.subcategory.toLowerCase();
        const sec = item.section.toLowerCase();
        const cat = item.category.toLowerCase();
        const desc = item.description.toLowerCase();
        const url = item.url.toLowerCase();

        // Title score: exact (10) > startsWith (8) > includes (6)
        let titleScore = 0;
        if (title === q) titleScore = 10;
        else if (title.startsWith(q)) titleScore = 8;
        else if (title.includes(q)) titleScore = 6;

        // Metadata score: subcategory (H1) > section (H2) > category (filename)
        let metaScore = 0;
        if (sub === q) metaScore = 10;
        else if (sub.startsWith(q)) metaScore = 9;
        else if (sub.includes(q)) metaScore = 8;
        else if (sec === q) metaScore = 7;
        else if (sec.startsWith(q)) metaScore = 6;
        else if (sec.includes(q)) metaScore = 5;
        else if (cat === q) metaScore = 4;
        else if (cat.startsWith(q)) metaScore = 3;
        else if (cat.includes(q)) metaScore = 2;

        const descMatch = desc.includes(q);
        const secMatch = sec.includes(q);
        const subMatch = sub.includes(q);
        const urlMatch = url.includes(q);

        const isMatch =
          titleScore > 0 ||
          metaScore > 0 ||
          descMatch ||
          secMatch ||
          subMatch ||
          urlMatch;

        return {
          item,
          titleScore,
          metaScore,
          isMatch,
        };
      });

      const hasMetadataMatch = decorated.some(
        (d) => d.isMatch && d.metaScore >= 5,
      );

      if (hasMetadataMatch) {
        // Filter items that match in some way
        const matched = decorated.filter((d) => d.isMatch);

        // Find the single best title match
        let bestTitleDecorated: (typeof decorated)[number] | null = null;
        let highestTitleScore = 0;

        matched.forEach((d) => {
          if (d.titleScore > highestTitleScore) {
            highestTitleScore = d.titleScore;
            bestTitleDecorated = d;
          }
        });

        // Separate items
        const metadataItems: typeof decorated = [];
        const otherItems: typeof decorated = [];

        matched.forEach((d) => {
          if (bestTitleDecorated && d.item.id === bestTitleDecorated.item.id)
            return;

          if (d.metaScore >= 5) {
            metadataItems.push(d);
          } else {
            otherItems.push(d);
          }
        });

        // Sort metadata matches: best match score first, then preserve original order
        metadataItems.sort((a, b) => {
          if (a.metaScore !== b.metaScore) return b.metaScore - a.metaScore;
          if (a.item.category !== b.item.category) {
            return a.item.category.localeCompare(b.item.category);
          }
          return (a.item.position ?? 0) - (b.item.position ?? 0);
        });

        // Sort other matches by starred
        otherItems.sort((a, b) => {
          const aStarred = a.item.starred ? 1 : 0;
          const bStarred = b.item.starred ? 1 : 0;
          if (aStarred !== bStarred) return bStarred - aStarred;
          return (a.item.position ?? 0) - (b.item.position ?? 0);
        });

        const finalResult: FMItem[] = [];
        if (bestTitleDecorated) {
          finalResult.push(
            (bestTitleDecorated as (typeof decorated)[number]).item,
          );
        }
        finalResult.push(...metadataItems.map((d) => d.item));
        finalResult.push(...otherItems.map((d) => d.item));

        return finalResult.slice(0, 200);
      } else {
        // Normal search (no category matches)
        const matched = decorated.filter((d) => d.isMatch);

        // Sort: title exact -> title starts-with -> title contains -> starred -> rest
        return matched
          .sort((a, b) => {
            if (a.titleScore !== b.titleScore)
              return b.titleScore - a.titleScore;

            const aStarred = a.item.starred ? 1 : 0;
            const bStarred = b.item.starred ? 1 : 0;
            if (aStarred !== bStarred) return bStarred - aStarred;

            return (a.item.position ?? 0) - (b.item.position ?? 0);
          })
          .map((d) => d.item)
          .slice(0, 200);
      }
    } else {
      // Default sort (starred first, then original order)
      result = [...result].sort((a, b) => {
        const aStarred = a.starred ? 1 : 0;
        const bStarred = b.starred ? 1 : 0;
        if (aStarred !== bStarred) return bStarred - aStarred;
        return (a.position ?? 0) - (b.position ?? 0);
      });
    }

    return result;
  }, [items, parsedSearch, selectedCategory, preferences.showNsfw]);

  // Compile favorites list
  const recentlyOpenedItems = useMemo(() => {
    if (searchText) return []; // Hide favorites section when searching

    return recentlyOpenedIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is FMItem => !!item);
  }, [items, recentlyOpenedIds, searchText]);

  // Compile normal items display list (if favorites are shown, we exclude them from the all list to avoid duplication)
  const mainItemsList = useMemo(() => {
    const list = filteredItems;
    if (searchText) return list.slice(0, 200);

    // If search is empty, filter out favorites from the main list
    const filtered = list.filter(
      (item) => !recentlyOpenedIds.includes(item.id),
    );
    return filtered.slice(0, 200);
  }, [filteredItems, recentlyOpenedIds, searchText]);

  // Extract unique categories for dropdown filter
  const categoriesList = useMemo(() => {
    const map = new Map<string, string>();
    CATEGORY_PAGES.forEach((page) => {
      map.set(page.category, page.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, []);

  // Generate Detail View Markdown Content
  const getDetailMarkdown = (item: FMItem) => {
    const starredBadge = item.starred ? " (Community Pick)" : "";

    let mirrorsSection = "";
    if (item.mirrors.length > 0) {
      mirrorsSection =
        `\n### Mirrors\n` +
        item.mirrors.map((m, idx) => `* [Mirror ${idx + 2}](${m})`).join("\n");
    }

    let alternativesSection = "";
    if (item.alternatives.length > 0) {
      alternativesSection =
        `\n### Alternatives\n` +
        item.alternatives
          .map((alt) => `* [${alt.name}](${alt.url})`)
          .join("\n");
    }

    let officialSection = "";
    if (item.officialLinks.length > 0) {
      officialSection =
        `\n### Official Links\n` +
        item.officialLinks
          .map((off) => `* [${off.name}](${off.url})`)
          .join("\n");
    }

    return `
# ${item.title}${starredBadge}

${item.description ? `> ${item.description}` : "*No description available.*"}

### Navigation Path
**${item.category.toUpperCase()}** › ${item.subcategory} ${item.section ? `› ${item.section}` : ""}

${mirrorsSection}
${alternativesSection}
${officialSection}
    `;
  };

  // Action Panel wrapper to track visits on actions
  const renderActions = (item: FMItem) => {
    return (
      <ActionPanel>
        <Action
          title="Open Primary Link"
          icon={Icon.Globe}
          onAction={async () => {
            await trackVisit(item);
            await open(item.url);
          }}
        />
        <Action
          title="Copy Primary Link"
          icon={Icon.CopyClipboard}
          onAction={async () => {
            await trackVisit(item);
            await Clipboard.copy(item.url);
            await showToast({
              style: Toast.Style.Success,
              title: "Copied link to clipboard",
            });
          }}
        />

        {/* Sub-section for Mirrors & Alternatives */}
        {(item.mirrors.length > 0 ||
          item.alternatives.length > 0 ||
          item.officialLinks.length > 0) && (
          <ActionPanel.Section title="Mirrors & Alternatives">
            {item.mirrors.map((mirrorUrl, idx) => {
              const shortcutKey = idx + 2;
              const shortcut =
                shortcutKey <= 9
                  ? {
                      modifiers: ["cmd"] as Keyboard.KeyModifier[],
                      key: shortcutKey.toString() as Keyboard.KeyEquivalent,
                    }
                  : undefined;

              return (
                <Action
                  key={`mirror-${idx}`}
                  title={`Open Mirror ${idx + 2}`}
                  icon={Icon.Globe}
                  onAction={async () => {
                    await trackVisit(item);
                    await open(mirrorUrl);
                  }}
                  shortcut={shortcut}
                />
              );
            })}
            {item.alternatives.map((alt, idx) => (
              <Action
                key={`alt-${idx}`}
                title={`Open Alternative: ${alt.name}`}
                icon={Icon.Globe}
                onAction={async () => {
                  await trackVisit(item);
                  await open(alt.url);
                }}
              />
            ))}
            {item.officialLinks.map((official, idx) => (
              <Action
                key={`official-${idx}`}
                title={`Open ${official.name}`}
                icon={Icon.Globe}
                onAction={async () => {
                  await trackVisit(item);
                  await open(official.url);
                }}
              />
            ))}
          </ActionPanel.Section>
        )}

        {/* Re-indexing & Administrative Actions */}
        <ActionPanel.Section title="Index Administration">
          <Action
            title="Force Refresh Index"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={handleForceSync}
          />
          {recentlyOpenedIds.length > 0 && (
            <Action
              title="Clear Favorites History"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              onAction={handleClearRecent}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        syncStatus || "Search FMHY (e.g. 'ai: generation' or 'movies')..."
      }
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={!isLoading && items.length > 0}
      searchBarAccessory={
        categoriesList.length > 0 ? (
          <List.Dropdown
            tooltip="Filter by Category"
            storeValue={true}
            onChange={(newValue) => setSelectedCategory(newValue)}
          >
            <List.Dropdown.Item title="All Categories" value="all" />
            <List.Dropdown.Item
              title="Starred Picks Only"
              value="starred-picks"
            />
            {categoriesList.map((cat) => (
              <List.Dropdown.Item
                key={cat.id}
                title={cat.name}
                value={cat.id}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {/* 1. Recently Opened Section */}
      {recentlyOpenedItems.length > 0 && (
        <List.Section title="Recently Opened / Favorites">
          {recentlyOpenedItems.map((item) => (
            <List.Item
              key={`recent-${item.id}`}
              title={item.title}
              subtitle={item.subcategory}
              icon={item.starred ? Icon.Star : Icon.Clock}
              detail={
                <List.Item.Detail
                  markdown={getDetailMarkdown(item)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Title"
                        text={item.title}
                      />
                      <List.Item.Detail.Metadata.Link
                        title="Primary URL"
                        text={item.url}
                        target={item.url}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Category"
                        text={item.category}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Subcategory"
                        text={item.subcategory}
                      />
                      {item.section && (
                        <List.Item.Detail.Metadata.Label
                          title="Section"
                          text={item.section}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={renderActions(item)}
            />
          ))}
        </List.Section>
      )}

      {/* 2. Main Wiki Resources Section */}
      <List.Section title={searchText ? "Search Results" : "All Resources"}>
        {mainItemsList.map((item) => (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subcategory}
            icon={item.starred ? Icon.Star : undefined}
            detail={
              <List.Item.Detail
                markdown={getDetailMarkdown(item)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Title"
                      text={item.title}
                    />
                    <List.Item.Detail.Metadata.Link
                      title="Primary URL"
                      text={item.url}
                      target={item.url}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Category"
                      text={item.category}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Subcategory"
                      text={item.subcategory}
                    />
                    {item.section && (
                      <List.Item.Detail.Metadata.Label
                        title="Section"
                        text={item.section}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={renderActions(item)}
          />
        ))}
      </List.Section>
    </List>
  );
}
