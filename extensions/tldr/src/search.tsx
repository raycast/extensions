import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  LocalStorage,
  getPreferenceValues,
  Detail,
  Color,
} from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useState, useEffect } from "react";

interface TldrPage {
  name: string;
  platform: string;
  language: string;
  content: string;
}

interface CacheData {
  pages: TldrPage[];
  lastUpdated: number;
  index: Record<string, TldrPage[]>;
}

const CACHE_KEY = "tldr-cache";
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

const PLATFORMS = ["common", "linux", "osx", "windows", "android", "freebsd", "netbsd", "openbsd", "sunos"];

interface GitHubTreeItem {
  path: string;
  type: string;
}

// Simple fetch with retry for network resilience
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      // For errors, use exponential backoff
      if (!response.ok && attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [pages, setPages] = useState<TldrPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<TldrPage[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const preferences = getPreferenceValues<Preferences.Search>();

  useEffect(() => {
    loadCache();
  }, []);

  useEffect(() => {
    filterPages();
  }, [searchText, pages, selectedPlatform]);

  const loadCache = async () => {
    try {
      const cached = await LocalStorage.getItem<string>(CACHE_KEY);

      if (cached) {
        const cacheData: CacheData = JSON.parse(cached);
        const age = Date.now() - cacheData.lastUpdated;

        if (age < CACHE_DURATION) {
          setPages(cacheData.pages);
          setIsLoading(false);
          return;
        }
      }

      await updateCache();
    } catch (error) {
      console.error("Error loading cache:", error);
      await updateCache();
    }
  };

  const updateCache = async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating TLDR pages...",
      message: "Starting...",
    });

    try {
      const allPages: TldrPage[] = [];
      const language = preferences.language || "en";
      const totalPlatforms = PLATFORMS.length;

      // Optimized hybrid approach:
      // 1. Single GitHub API call to get ALL file paths (tree API with recursive=1)
      // 2. Fetch content from CDN (raw.githubusercontent.com - no rate limits)

      toast.message = "Fetching file tree...";

      // Fetch entire tree in ONE API call
      const treeUrl = "https://api.github.com/repos/tldr-pages/tldr/git/trees/main?recursive=1";
      const treeResponse = await fetchWithRetry(treeUrl);

      if (!treeResponse.ok) {
        throw new Error(`Failed to fetch tree: ${treeResponse.statusText}`);
      }

      const treeData = (await treeResponse.json()) as { tree: GitHubTreeItem[] };
      const pagesPrefix = language === "en" ? "pages/" : `pages.${language}/`;

      // Group files by platform
      const filesByPlatform: Record<string, string[]> = {};
      for (const item of treeData.tree) {
        if (item.type === "blob" && item.path.startsWith(pagesPrefix) && item.path.endsWith(".md")) {
          const relativePath = item.path.substring(pagesPrefix.length);
          const parts = relativePath.split("/");
          if (parts.length === 2) {
            const [platform, filename] = parts;
            if (PLATFORMS.includes(platform)) {
              if (!filesByPlatform[platform]) {
                filesByPlatform[platform] = [];
              }
              filesByPlatform[platform].push(filename);
            }
          }
        }
      }

      // Fetch content for each platform
      for (let i = 0; i < PLATFORMS.length; i++) {
        const platform = PLATFORMS[i];
        const mdFiles = filesByPlatform[platform] || [];

        if (mdFiles.length === 0) continue;

        const progress = i / totalPlatforms;
        setLoadingProgress(progress);

        toast.message = `Fetching ${platform} (${i + 1}/${totalPlatforms})...`;

        try {
          // Fetch content from CDN (no rate limits)
          // Fetch in batches of 50 for better performance
          const BATCH_SIZE = 50;
          for (let j = 0; j < mdFiles.length; j += BATCH_SIZE) {
            const batch = mdFiles.slice(j, j + BATCH_SIZE);

            const batchResults = await Promise.allSettled(
              batch.map(async (file) => {
                const name = file.replace(".md", "");
                const contentUrl = `https://raw.githubusercontent.com/tldr-pages/tldr/main/${pagesPrefix}${platform}/${file}`;
                const contentResponse = await fetch(contentUrl);
                if (!contentResponse.ok) {
                  throw new Error(`Failed to fetch ${name}: ${contentResponse.statusText}`);
                }
                const content = await contentResponse.text();
                return { name, platform, language, content };
              }),
            );

            for (const result of batchResults) {
              if (result.status === "fulfilled") {
                allPages.push(result.value);
              }
            }

            toast.message = `${platform}: ${allPages.length} pages loaded...`;
          }
        } catch (err) {
          console.error(`Error fetching platform ${platform}:`, err);
        }
      }

      const cacheData: CacheData = {
        pages: allPages,
        lastUpdated: Date.now(),
        index: buildIndex(allPages),
      };

      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setPages(allPages);
      setLoadingProgress(1);

      toast.style = Toast.Style.Success;
      toast.title = `Updated ${allPages.length} pages`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update";
      toast.message = String(error);
    } finally {
      setIsLoading(false);
    }
  };

  const buildIndex = (pages: TldrPage[]): Record<string, TldrPage[]> => {
    const index: Record<string, TldrPage[]> = {};
    for (const page of pages) {
      if (!index[page.name]) {
        index[page.name] = [];
      }
      index[page.name].push(page);
    }
    return index;
  };

  const filterPages = () => {
    let filtered = pages;

    // Filter by platform
    if (selectedPlatform !== "all") {
      filtered = filtered.filter((page) => page.platform === selectedPlatform);
    }

    // Filter by search text
    if (searchText) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(
        (page) => page.name.toLowerCase().includes(query) || page.content.toLowerCase().includes(query),
      );
    }

    setFilteredPages(filtered);
  };

  const clearCache = async () => {
    await LocalStorage.removeItem(CACHE_KEY);
    setPages([]);
    await showToast({
      style: Toast.Style.Success,
      title: "Cache cleared",
    });
  };

  const groupedPages = filteredPages.reduce(
    (acc, page) => {
      if (!acc[page.name]) {
        acc[page.name] = [];
      }
      acc[page.name].push(page);
      return acc;
    },
    {} as Record<string, TldrPage[]>,
  );

  // Calculate platform counts
  const platformCounts = pages.reduce(
    (acc, page) => {
      acc[page.platform] = (acc[page.platform] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search TLDR pages..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Platform" value={selectedPlatform} onChange={setSelectedPlatform} storeValue>
          <List.Dropdown.Item title="All Platforms" value="all" icon={Icon.Globe} />
          <List.Dropdown.Section title="Platforms">
            {PLATFORMS.map((platform) => (
              <List.Dropdown.Item
                key={platform}
                title={`${platform} (${platformCounts[platform] || 0})`}
                value={platform}
                icon={Icon.Folder}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {Object.entries(groupedPages).map(([name, pageVariants]) => {
        const preferredPlatform = preferences.platform || "common";
        const mainPage =
          pageVariants.find((p) => p.platform === preferredPlatform) ||
          pageVariants.find((p) => p.platform === "common") ||
          pageVariants[0];

        const progressIcon = isLoading ? getProgressIcon(loadingProgress, Color.Blue) : undefined;

        return (
          <List.Item
            key={`${name}-${mainPage.platform}`}
            title={name}
            subtitle={mainPage.platform}
            icon={progressIcon || { source: Icon.Terminal, tintColor: Color.Blue }}
            accessories={[{ text: pageVariants.length > 1 ? `${pageVariants.length} platforms` : "" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Page"
                  icon={Icon.Eye}
                  target={<PageDetail page={mainPage} allVariants={pageVariants} />}
                />
                <Action.CopyToClipboard title="Copy Name" content={name} shortcut={{ modifiers: ["cmd"], key: "c" }} />
                <ActionPanel.Section>
                  <Action
                    title="Update Cache"
                    icon={Icon.Download}
                    onAction={updateCache}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Clear Cache"
                    icon={Icon.Trash}
                    onAction={clearCache}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && filteredPages.length === 0 && (
        <List.EmptyView
          title="No pages found"
          description="Try updating the cache or searching for a different command"
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

function PageDetail({ page, allVariants }: { page: TldrPage; allVariants: TldrPage[] }) {
  const [selectedVariant, setSelectedVariant] = useState(page);

  const renderMarkdown = (content: string): string => {
    let markdown = `# ${selectedVariant.name}\n\n`;
    markdown += `**Platform:** ${selectedVariant.platform}\n\n`;

    const lines = content.split("\n").filter((line) => !line.startsWith("#"));

    for (const line of lines) {
      if (line.startsWith(">")) {
        markdown += `${line.substring(1).trim()}\n\n`;
      } else if (line.startsWith("-")) {
        markdown += `${line}\n`;
      } else if (line.startsWith("`")) {
        markdown += `\n${line}\n`;
      } else if (line.trim()) {
        markdown += `${line}\n`;
      }
    }

    return markdown;
  };

  const copyCommand = (content: string) => {
    const codeBlocks = content.match(/`[^`]+`/g);
    if (codeBlocks && codeBlocks.length > 0) {
      const command = codeBlocks[0]
        .replace(/`/g, "")
        .replace(/\{\{[^}]+\}\}/g, "<placeholder>")
        .replace(/\s+/g, " ")
        .trim();
      return command;
    }
    return "";
  };

  return (
    <Detail
      markdown={renderMarkdown(selectedVariant.content)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy First Example" content={copyCommand(selectedVariant.content)} />
          <Action.CopyToClipboard
            title="Copy All Content"
            content={selectedVariant.content}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {allVariants.length > 1 && (
            <ActionPanel.Submenu title="Switch Platform" icon={Icon.ComputerChip}>
              {allVariants.map((variant) => (
                <Action key={variant.platform} title={variant.platform} onAction={() => setSelectedVariant(variant)} />
              ))}
            </ActionPanel.Submenu>
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Command" text={selectedVariant.name} />
          <Detail.Metadata.Label title="Platform" text={selectedVariant.platform} />
          <Detail.Metadata.Label title="Language" text={selectedVariant.language} />
          {allVariants.length > 1 && (
            <Detail.Metadata.TagList title="Available Platforms">
              {allVariants.map((v) => (
                <Detail.Metadata.TagList.Item key={v.platform} text={v.platform} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}
