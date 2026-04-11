import {
  ActionPanel,
  Action,
  List,
  LocalStorage,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";

const LLMS_FULL_URL = "https://docs.cocartapi.com/llms-full.txt";
const LLMS_TXT_URL = "https://docs.cocartapi.com/llms.txt";
const CACHE_KEY = "cocart-docs-cache";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface DocEntry {
  title: string;
  url: string;
  description: string;
  content: string;
  category: string;
  version: string;
}

interface CachedData {
  entries: DocEntry[];
  timestamp: number;
}

function categorizeFromUrl(url: string): string {
  if (url.includes("/api-reference/v2/cart/")) return "Cart";
  if (url.includes("/api-reference/v2/products/")) return "Products";
  if (url.includes("/api-reference/v2/sessions/")) return "Sessions";
  if (url.includes("/api-reference/v2/store/")) return "Store";
  if (url.includes("/api-reference/v2/user/")) return "User";
  if (url.includes("/api-reference/v2/variation")) return "Cart";
  if (url.includes("/api-reference/v1/cart/plus/")) return "Cart (Plus)";
  if (url.includes("/api-reference/v1/cart/")) return "Cart";
  if (url.includes("/api-reference/v1/products/")) return "Products";
  if (url.includes("/api-reference/v1/user/")) return "User";
  if (url.includes("/api-reference/v1/error")) return "Error Codes";
  if (url.includes("/api-reference/jwt/")) return "JWT";
  if (url.includes("/api-reference/plugins/")) return "Plugins";
  if (url.includes("/api-reference/")) return "API Reference";
  if (url.includes("/getting-started/jwt/")) return "JWT Setup";
  if (url.includes("/getting-started/")) return "Getting Started";
  if (url.includes("/tutorials/")) return "Tutorials";
  if (url.includes("/documentation/developers/jwt/")) return "JWT Developers";
  if (url.includes("/documentation/developers/")) return "Developers";
  if (url.includes("/documentation/")) return "Documentation";
  if (url.includes("/knowledge-base/troubleshoot/")) return "Troubleshooting";
  if (url.includes("/knowledge-base/")) return "Knowledge Base";
  if (url.includes("/cli-reference/")) return "CLI Reference";
  if (url.includes("/breaking-changes/")) return "Breaking Changes";
  if (url.includes("/overview/")) return "Overview";
  if (url.includes("/plugins/")) return "Plugins";
  if (url.includes("/resources/")) return "Resources";
  if (url.includes("/updates/")) return "Updates";
  return "Other";
}

function versionFromUrl(url: string): string {
  if (url.includes("/api-reference/v1/")) return "v1";
  if (url.includes("/api-reference/v2/")) return "v2";
  if (url.includes("/api-reference/pre-release/")) return "pre-release";
  return "shared";
}

function categoryIcon(category: string): Icon {
  switch (category) {
    case "Cart":
    case "Cart (Plus)":
      return Icon.Cart;
    case "Products":
      return Icon.Box;
    case "Sessions":
      return Icon.TwoPeople;
    case "Store":
      return Icon.Building;
    case "User":
      return Icon.Person;
    case "JWT":
    case "JWT Developers":
    case "JWT Setup":
      return Icon.Lock;
    case "API Reference":
    case "Error Codes":
      return Icon.Code;
    case "Getting Started":
      return Icon.Star;
    case "Tutorials":
      return Icon.Bookmark;
    case "Developers":
      return Icon.Terminal;
    case "Documentation":
      return Icon.Book;
    case "Knowledge Base":
    case "Troubleshooting":
      return Icon.QuestionMark;
    case "CLI Reference":
      return Icon.Terminal;
    case "Breaking Changes":
      return Icon.Warning;
    case "Overview":
      return Icon.Info;
    case "Plugins":
      return Icon.Plug;
    case "Resources":
      return Icon.Link;
    case "Updates":
      return Icon.Bell;
    default:
      return Icon.Document;
  }
}

function parseLlmsTxt(text: string): Map<string, string> {
  const descriptions = new Map<string, string>();
  for (const line of text.split("\n")) {
    const match = line
      .trim()
      .match(/^-\s+\[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?$/);
    if (match && match[3]) {
      descriptions.set(match[2], match[3]);
    }
  }
  return descriptions;
}

function isContentSparse(content: string): boolean {
  const lines = content
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0);
  return lines.length <= 3 || /openapi.*\.yaml\s/i.test(content);
}

function parseLlmsFullTxt(text: string): DocEntry[] {
  const seen = new Map<string, number>();
  const entries: DocEntry[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const titleMatch = lines[i].match(/^# (.+)$/);
    if (
      titleMatch &&
      i + 1 < lines.length &&
      lines[i + 1].startsWith("Source: ")
    ) {
      const title = titleMatch[1];
      const url = lines[i + 1].replace("Source: ", "").trim();
      i += 2;

      const contentLines: string[] = [];
      while (i < lines.length) {
        if (
          lines[i].match(/^# .+$/) &&
          i + 1 < lines.length &&
          lines[i + 1].startsWith("Source: ")
        ) {
          break;
        }
        contentLines.push(lines[i]);
        i++;
      }

      const content = contentLines.join("\n").trim();

      // Deduplicate by URL — keep the entry with more content
      const existing = seen.get(url);
      if (existing !== undefined) {
        if (content.length > entries[existing].content.length) {
          entries[existing] = {
            title,
            url,
            description: "",
            content,
            category: categorizeFromUrl(url),
            version: versionFromUrl(url),
          };
        }
      } else {
        seen.set(url, entries.length);
        entries.push({
          title,
          url,
          description: "",
          content,
          category: categorizeFromUrl(url),
          version: versionFromUrl(url),
        });
      }
    } else {
      i++;
    }
  }

  return entries;
}

function stripMdx(content: string): string {
  // Convert components with title attributes into markdown headings
  let result = content.replace(
    /<Accordion\s+[^>]*title="([^"]*)"[^>]*>/gi,
    "\n### $1\n",
  );
  result = result.replace(/<Tab\s+[^>]*title="([^"]*)"[^>]*>/gi, "\n**$1**\n");
  result = result.replace(/<Step\s+[^>]*title="([^"]*)"[^>]*>/gi, "\n**$1**\n");

  // Strip all remaining MDX/JSX component tags (PascalCase) — preserves standard HTML
  result = result.replace(/<\/?[A-Z][A-Za-z]*[^>]*\/?>/g, "");
  result = result.replace(/<\/?aside[^>]*>/gi, "");
  result = result.replace(/<br\s*\/?>/g, "\n");

  // Process code blocks — normalize fences and dedent content
  result = result.replace(
    /^[ \t]*(```\w+)(?:\s+[^\n]*)?\n([\s\S]*?)^[ \t]*```$/gm,
    (_, lang, body) => {
      const lines = body.split("\n");
      const indents = lines
        .filter((l: string) => l.trim().length > 0)
        .map((l: string) => l.match(/^([ \t]*)/)?.[1].length ?? 0);
      const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
      const dedented = lines.map((l: string) => l.slice(minIndent)).join("\n");
      return `${lang}\n${dedented}\`\`\``;
    },
  );

  // Dedent non-code-block lines — indented text from MDX nesting renders as
  // blockquotes/code in markdown. Strip leading whitespace outside code fences.
  const outputLines: string[] = [];
  let inCodeBlock = false;
  for (const line of result.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      outputLines.push(line);
    } else if (inCodeBlock) {
      outputLines.push(line);
    } else {
      outputLines.push(line.replace(/^[ \t]+/, ""));
    }
  }

  return outputLines.join("\n");
}

function mergeDescriptions(entries: DocEntry[], indexText: string): void {
  const rawDescriptions = parseLlmsTxt(indexText);
  const descriptions = new Map<string, string>();
  for (const [url, desc] of rawDescriptions) {
    descriptions.set(url.replace(/\.md$/, ""), desc);
  }
  for (const entry of entries) {
    const desc = descriptions.get(entry.url);
    if (desc) entry.description = desc;
    if (isContentSparse(entry.content) && desc) {
      entry.content = `${desc}\n\n---\n\n*To view the API specifications, open in browser for a full interactive reference.*`;
    }
  }
}

async function loadCachedEntries(): Promise<DocEntry[] | null> {
  const cached = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!cached) return null;

  try {
    const data: CachedData = JSON.parse(cached);
    if (Date.now() - data.timestamp < CACHE_TTL) {
      return data.entries;
    }
  } catch {
    // Invalid cache
  }
  return null;
}

async function cacheEntries(entries: DocEntry[]): Promise<void> {
  const data: CachedData = { entries, timestamp: Date.now() };
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

async function fetchAndParse(): Promise<DocEntry[]> {
  const [fullResponse, indexResponse] = await Promise.all([
    fetch(LLMS_FULL_URL),
    fetch(LLMS_TXT_URL),
  ]);
  if (!fullResponse.ok)
    throw new Error(`Failed to fetch docs: ${fullResponse.status}`);

  const parsed = parseLlmsFullTxt(await fullResponse.text());
  if (indexResponse.ok) {
    mergeDescriptions(parsed, await indexResponse.text());
  }
  return parsed;
}

// Dropdown filter value format: "version:category" or just "version"
function buildDropdownOptions(entries: DocEntry[]) {
  // Stable (v2) categories
  const v2Cats = [
    ...new Set(
      entries.filter((e) => e.version === "v2").map((e) => e.category),
    ),
  ];
  const v2Order = ["Cart", "Products", "Sessions", "Store", "User"];
  v2Cats.sort((a, b) => {
    const ai = v2Order.indexOf(a);
    const bi = v2Order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  // Legacy (v1) categories
  const v1Cats = [
    ...new Set(
      entries.filter((e) => e.version === "v1").map((e) => e.category),
    ),
  ];
  const v1Order = ["Cart", "Cart (Plus)", "Products", "User", "Error Codes"];
  v1Cats.sort((a, b) => {
    const ai = v1Order.indexOf(a);
    const bi = v1Order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  // Shared docs categories
  const sharedCats = [
    ...new Set(
      entries.filter((e) => e.version === "shared").map((e) => e.category),
    ),
  ];
  const sharedOrder = [
    "API Reference",
    "JWT",
    "Getting Started",
    "JWT Setup",
    "Tutorials",
    "Documentation",
    "Developers",
    "JWT Developers",
    "CLI Reference",
    "Knowledge Base",
    "Troubleshooting",
    "Overview",
    "Plugins",
    "Breaking Changes",
    "Resources",
    "Updates",
  ];
  sharedCats.sort((a, b) => {
    const ai = sharedOrder.indexOf(a);
    const bi = sharedOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return { v2Cats, v1Cats, sharedCats };
}

function applyFilter(entries: DocEntry[], filter: string): DocEntry[] {
  if (filter === "all") return entries;
  if (filter === "stable") return entries.filter((e) => e.version !== "v1");
  if (filter === "legacy") return entries.filter((e) => e.version !== "v2");

  // "v2:Cart" or "v1:Products" or "shared:Tutorials"
  const [version, ...catParts] = filter.split(":");
  const category = catParts.join(":");
  return entries.filter(
    (e) => e.version === version && e.category === category,
  );
}

export default function SearchDocs() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("stable");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    async function fetchDocs() {
      try {
        const cached = await loadCachedEntries();
        if (cached) {
          setEntries(cached);
          setIsLoading(false);
          return;
        }

        const parsed = await fetchAndParse();
        setEntries(parsed);
        await cacheEntries(parsed);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load CoCart docs",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocs();
  }, []);

  const dropdownOptions = useMemo(
    () => buildDropdownOptions(entries),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    // When searching, search all entries regardless of filter
    const source = searchText ? entries : applyFilter(entries, selectedFilter);

    if (searchText) {
      const query = searchText.toLowerCase();
      return source.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query) ||
          e.content.toLowerCase().includes(query) ||
          e.url.toLowerCase().includes(query),
      );
    }

    return source;
  }, [entries, selectedFilter, searchText]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, DocEntry[]> = {};
    for (const entry of filteredEntries) {
      if (!groups[entry.category]) groups[entry.category] = [];
      groups[entry.category].push(entry);
    }
    return Object.entries(groups);
  }, [filteredEntries]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search CoCart documentation..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Docs" onChange={setSelectedFilter}>
          <List.Dropdown.Item title="All Docs" value="all" icon={Icon.List} />

          <List.Dropdown.Section title="API Reference (v2)">
            <List.Dropdown.Item
              title="All"
              value="stable"
              icon={Icon.CheckCircle}
            />
            {dropdownOptions.v2Cats.map((cat) => (
              <List.Dropdown.Item
                key={`v2:${cat}`}
                title={cat}
                value={`v2:${cat}`}
                icon={categoryIcon(cat)}
              />
            ))}
          </List.Dropdown.Section>

          <List.Dropdown.Section title="API Reference (v1)">
            <List.Dropdown.Item title="All" value="legacy" icon={Icon.Clock} />
            {dropdownOptions.v1Cats.map((cat) => (
              <List.Dropdown.Item
                key={`v1:${cat}`}
                title={cat}
                value={`v1:${cat}`}
                icon={categoryIcon(cat)}
              />
            ))}
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Guides & Reference">
            {dropdownOptions.sharedCats.map((cat) => (
              <List.Dropdown.Item
                key={`shared:${cat}`}
                title={cat}
                value={`shared:${cat}`}
                icon={categoryIcon(cat)}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {groupedEntries.map(([category, items]) => (
        <List.Section
          key={category}
          title={category}
          subtitle={`${items.length}`}
        >
          {items.map((entry) => (
            <List.Item
              key={entry.url}
              title={entry.title}
              icon={categoryIcon(entry.category)}
              detail={<List.Item.Detail markdown={stripMdx(entry.content)} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={entry.url.replace(/\.md$/, "")}
                    title="Open in Browser"
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={entry.url.replace(/\.md$/, "")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={entry.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                  <Action
                    title="Refresh Cache"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      setIsLoading(true);
                      try {
                        await LocalStorage.removeItem(CACHE_KEY);
                        const parsed = await fetchAndParse();
                        setEntries(parsed);
                        await cacheEntries(parsed);
                        showToast({
                          style: Toast.Style.Success,
                          title: "Cache refreshed",
                        });
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to refresh",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Unknown error",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
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
