import React from "react";
import "cross-fetch/polyfill";
import {
  List,
  ActionPanel,
  Action,
  LocalStorage,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  Detail,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import * as cheerio from "cheerio";
import { getBestGateway } from "./utils/ao";

interface DocEntry {
  title: string;
  url: string;
  content: string;
  lastIndexed: number;
  section: string;
  relevanceScore?: number;
}

interface Preferences {
  defaultGateway: string;
  useWayfinder: boolean;
}

const DOC_SOURCES = [
  {
    url: "cookbook_ao",
    section: "AO Cookbook",
    type: "gateway_subdomain",
    navSelector:
      ".VPSidebarNav a.link, .VPSidebarItem a.link, .VPDocAsideOutline a.link, aside a[href]:not([href^='http'])",
    contentSelector: ".vp-doc",
    titleSelector: "h1:first-of-type",
    entryPath: "/mainnet/index.html",
  },
  {
    url: "cookbook",
    section: "Arweave Cookbook",
    type: "gateway_subdomain",
    navSelector:
      "div[class*='sidebar'] a[class*='link'], .VPSidebarNav a.link, .VPSidebarItem a.link, .VPDocAsideOutline a.link, aside a[href]:not([href^='http']), nav.sidebar a[href], .sidebar-links a[href]",
    contentSelector: ".cookbook-content .col-12",
    titleSelector: "h1:first-of-type",
    entryPath: "/getting-started/index.html",
  },
  {
    url: "docs.ar.io",
    section: "AR.IO Documentation",
    type: "fixed",
    navSelector:
      "nav a, .sidebar a, .navigation a, .prose a, [class*=text-lg][class*=font-semibold] a",
    contentSelector: ".prose",
    titleSelector: "h1:first-of-type",
    entryPath: "/",
  },
];

function shouldSkipPath(
  path: string,
  source: (typeof DOC_SOURCES)[0],
): boolean {
  const pathWithoutHash = path.split("#")[0];
  const segments = pathWithoutHash.split("/").filter(Boolean);

  if (path.startsWith("http")) {
    return true;
  }

  if (path.match(/\.(js|css|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/i)) {
    return true;
  }

  const uniqueSegments = new Set(segments);
  if (uniqueSegments.size < segments.length) {
    return true;
  }

  if (source.url === "docs.ar.io" && path.includes("release-notes")) {
    const releases = path.match(/release-\d+/g);
    if (releases && releases.length > 0) {
      const releaseNum = parseInt(releases[0].split("-")[1]);
      if (releaseNum < 26) {
        return true;
      }
    }
  }

  if (path.match(/^\/(zh|ja)\//)) {
    return true;
  }

  if (path.includes("#")) {
    const hash = path.split("#")[1];
    if (hash.includes("/") || !hash) {
      return true;
    }
  }

  return false;
}

function normalizePath(base: string, href: string): string {
  if (href.startsWith("/")) {
    return href;
  }

  const baseSegments = base.split("/").filter(Boolean);
  const isFile = base.endsWith(".html") || base.endsWith(".md");
  if (isFile) {
    baseSegments.pop();
  }

  if (href.startsWith("./")) {
    href = href.slice(2);
  }

  const hrefSegments = href.split("/").filter(Boolean);
  const resultSegments = [...baseSegments];

  for (const segment of hrefSegments) {
    if (segment === "..") {
      resultSegments.pop();
    } else {
      resultSegments.push(segment);
    }
  }

  const uniqueSegments = [...new Set(resultSegments)];
  return "/" + uniqueSegments.join("/");
}

const cleanTitle = (title: string) => {
  // Remove markdown heading symbols and trim whitespace
  return title.replace(/^#+\s*/, "").trim();
};

const parseHtmlContent = (
  html: string,
  source?: (typeof DOC_SOURCES)[0],
): string => {
  const $ = cheerio.load(html);

  // Remove only the most unnecessary elements
  $(".header-anchor").remove(); // Remove header anchor links
  $(".external-link-icon").remove(); // Remove external link icons
  $(".external-link-icon-sr-only").remove(); // Remove screen reader text
  $(".page-nav").remove(); // Remove navigation
  $(".edit-link").remove(); // Remove edit links
  $(".code-copy").remove(); // Remove copy buttons
  $('[class*="group/anchor"]').remove(); // Remove anchor icons

  // Process divs with specific classes
  $('div[class*="flex"], div[class*="items-center"]').each((_, elem) => {
    // Preserve the content but remove the container
    const content = $(elem).html();
    if (content) {
      $(elem).replaceWith(content);
    }
  });

  // Process tables with better formatting
  $("table").each((_, elem) => {
    const headers = $(elem)
      .find("th")
      .map((_, th) => {
        const text = $(th).text().trim();
        // Center align by default for better readability
        return text.padStart(text.length + 2).padEnd(text.length + 4);
      })
      .get();

    const rows = $(elem)
      .find("tbody tr")
      .map((_, tr) => {
        return $(tr)
          .find("td")
          .map((_, td) => {
            const text = $(td).text().trim();
            return text.padStart(text.length + 2).padEnd(text.length + 4);
          })
          .get();
      })
      .get();

    let markdown = "\n";
    markdown += "| " + headers.join(" | ") + " |\n";
    markdown += "|" + headers.map(() => ":---:").join("|") + "|\n";
    rows.forEach((row) => {
      markdown += "| " + row.join(" | ") + " |\n";
    });

    $(elem).replaceWith(markdown + "\n");
  });

  // Process images with alignment
  $("img").each((_, elem) => {
    const src = $(elem).attr("src");
    const alt = $(elem).attr("alt") || "";
    const parent = $(elem).parent();
    const isCenter =
      parent.attr("style")?.includes("center") ||
      parent.attr("class")?.includes("center") ||
      parent.attr("align") === "center";

    if (src) {
      const imgMd = `![${alt}](${src})`;
      $(elem).replaceWith(
        isCenter
          ? `\n<div align="center">\n\n${imgMd}\n\n</div>\n`
          : `\n${imgMd}\n`,
      );
    }
  });

  // Process code blocks with better language detection
  $('div[class*="language-"], pre[class*="language-"]').each((_, elem) => {
    const language =
      $(elem)
        .attr("class")
        ?.match(/language-(\w+)/)?.[1] || "";
    const code = $(elem).find("code").text().trim();
    $(elem).replaceWith(`\n\`\`\`${language}\n${code}\n\`\`\`\n`);
  });

  // Process inline code
  $('code:not([class*="language-"])').each((_, elem) => {
    const code = $(elem).text().trim();
    $(elem).replaceWith(`\`${code}\``);
  });

  // Process headers with better spacing
  $("h1, h2, h3, h4, h5, h6").each((_, elem) => {
    if (elem.type === "tag") {
      const level = elem.name.replace("h", "");
      const text = $(elem).text().trim();
      // Add more spacing before and after headers based on their level
      const spacing = level === "1" ? 3 : level === "2" ? 2 : 1;
      $(elem).replaceWith(
        `${"\n".repeat(spacing + 1)}${"#".repeat(parseInt(level))} ${text}${"\n".repeat(spacing)}`,
      );
    }
  });

  // Process paragraphs with better spacing
  $("p").each((_, elem) => {
    const html = $(elem).html() || "";
    const text = $("<div>").html(html).text().trim();
    // Add double line breaks after paragraphs
    $(elem).replaceWith(`\n\n${text}\n\n`);
  });

  // Process line breaks
  $("br").each((_, elem) => {
    $(elem).replaceWith("\n");
  });

  // Process divs that might represent blocks of content
  $("div").each((_, elem) => {
    const $elem = $(elem);
    // Only add spacing if the div contains direct text or is a block-level container
    if (
      ($elem.text().trim() && !$elem.children().length) ||
      $elem.attr("class")?.includes("block") ||
      $elem.attr("class")?.includes("content")
    ) {
      const content = $elem.html() || "";
      $elem.replaceWith(`\n\n${content}\n\n`);
    }
  });

  // Process links with better URL handling
  $("a").each((_, elem) => {
    const href = $(elem).attr("href");
    const text = $(elem).text().trim();
    if (href) {
      if (href.startsWith("#")) {
        // Internal anchor link
        $(elem).replaceWith(`[${text}](#${href.slice(1)})`);
      } else if (href.startsWith("http")) {
        $(elem).replaceWith(`[${text}](${href})`);
      } else if (source) {
        const baseUrl =
          source.type === "fixed"
            ? `https://${source.url}`
            : `https://${source.url}.arweave.net`;
        const fullUrl = href.startsWith("/")
          ? `${baseUrl}${href}`
          : `${baseUrl}/${href}`;
        $(elem).replaceWith(`[${text}](${fullUrl})`);
      } else {
        $(elem).replaceWith(text);
      }
    }
  });

  // Process lists with better nesting and formatting
  $("ul, ol").each((_, elem) => {
    const processListItems = (items: cheerio.Cheerio, level = 0): string[] => {
      return items
        .map((_, li) => {
          const $li = $(li);
          const text = $li
            .clone()
            .children("ul, ol")
            .remove()
            .end()
            .text()
            .trim();
          const nestedList = $li.children("ul, ol");
          const indent = "  ".repeat(level);

          let result = `${indent}- ${text}`;
          if (nestedList.length) {
            result +=
              "\n" +
              processListItems(nestedList.children("li"), level + 1).join("\n");
          }
          return result;
        })
        .get();
    };

    const listItems = processListItems($(elem).children("li"));
    $(elem).replaceWith("\n" + listItems.join("\n") + "\n");
  });

  // Process text formatting
  $("strong, b").each((_, elem) => {
    const text = $(elem).text().trim();
    $(elem).replaceWith(`**${text}**`);
  });

  $("em, i").each((_, elem) => {
    const text = $(elem).text().trim();
    $(elem).replaceWith(`*${text}*`);
  });

  // Get the processed text and clean it up
  let text = $.root()
    .contents()
    .text()
    .replace(/\n{4,}/g, "\n\n\n") // Replace excessive newlines with at most 3
    .replace(/\n\s+\n/g, "\n\n") // Clean up spaces between newlines
    .trim();

  // Add some final formatting improvements
  text = text
    .replace(/\*\*\s+\*\*/g, "") // Remove empty bold tags
    .replace(/\*\s+\*/g, "") // Remove empty italic tags
    .replace(/\[\s*\]\(\s*\)/g, "") // Remove empty links
    .replace(/\n{4,}/g, "\n\n\n"); // Final newline cleanup, max 3 newlines

  return text;
};

const getMarkdownContent = (doc: DocEntry, searchTerms: string[] = []) => {
  const sections = [];

  // Add title
  sections.push(`# ${doc.title}\n`);

  // Add metadata
  sections.push(`**Section:** ${doc.section}`);
  sections.push(
    `**Last Updated:** ${new Date(doc.lastIndexed).toLocaleString()}\n`,
  );

  // Parse and format the content
  let content = doc.content;
  const source = DOC_SOURCES.find((s) => s.section === doc.section);
  if (doc.section === "AO Cookbook" || doc.section === "Arweave Cookbook") {
    content = parseHtmlContent(content, source);
  }

  // Add search term highlighting
  searchTerms.forEach((term) => {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    content = content.replace(regex, `**${term}**`);
  });

  // Split content into paragraphs and format
  const paragraphs = content.split(/\n\n+/);
  sections.push(...paragraphs.map((p) => p.trim()));

  return sections.join("\n\n");
};

function getSimilarityScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Exact match gets highest score
  if (s1 === s2) return 1000;

  // Direct contains gets high score
  if (s1.includes(s2)) return 500;

  let score = 0;
  const minLen = Math.min(s1.length, s2.length);

  // Check for common prefix (weighted higher)
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) {
      score += 3;
    } else {
      break;
    }
  }

  // Check for common characters in order
  let lastFoundIndex = -1;
  for (const char of s2) {
    const index = s1.indexOf(char, lastFoundIndex + 1);
    if (index > lastFoundIndex) {
      score += 2;
      lastFoundIndex = index;
    }
  }

  // Penalize length difference
  score -= Math.abs(s1.length - s2.length) * 0.5;

  return score;
}

export default function DocsCommand() {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const { defaultGateway, useWayfinder } = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadDocs();
  }, []);

  async function loadDocs() {
    try {
      const cachedDocs = await LocalStorage.getItem<string>("arweave-docs");
      const lastIndexed =
        await LocalStorage.getItem<number>("docs-last-indexed");
      const now = Date.now();

      if (
        cachedDocs &&
        lastIndexed &&
        now - lastIndexed < 24 * 60 * 60 * 1000
      ) {
        setDocs(JSON.parse(cachedDocs));
        setLastUpdateTime(new Date(lastIndexed));
        setIsLoading(false);
        return;
      }

      await refreshDocs();
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load docs",
        message: "Please try refreshing manually",
      });
      setIsLoading(false);
    }
  }

  async function refreshDocs() {
    if (isRefreshing) return;

    setIsRefreshing(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Indexing Documentation...",
    });

    try {
      const gateway = useWayfinder ? await getBestGateway() : defaultGateway;
      const cleanGateway = gateway
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "");

      const allDocs: DocEntry[] = [];
      const processedPaths = new Set<string>();

      for (const source of DOC_SOURCES) {
        try {
          const baseUrl =
            source.type === "fixed"
              ? `https://${source.url}`
              : `https://${source.url}.${cleanGateway}`;

          // Start with the main page
          const mainUrl = `${baseUrl}${source.entryPath}`;
          const mainResponse = await axios.get(mainUrl);
          const $main = cheerio.load(mainResponse.data);

          // Get all navigation links at once
          const paths = new Set<string>();
          paths.add(source.entryPath);

          $main(source.navSelector).each((_, element) => {
            const href = $main(element).attr("href");
            if (!href || href.startsWith("http") || href.startsWith("#")) {
              return;
            }

            const [path] = href.split("#");
            const normalizedPath = normalizePath(source.entryPath, path);

            if (shouldSkipPath(normalizedPath, source)) {
              return;
            }

            let finalPath = normalizedPath;
            if (!finalPath.endsWith("/") && !finalPath.endsWith(".html")) {
              finalPath = finalPath + "/";
            }

            paths.add(finalPath);
          });

          // Process each unique path
          for (const currentPath of paths) {
            if (processedPaths.has(currentPath)) continue;

            try {
              const fullUrl = `${baseUrl}${currentPath}`
                .replace(/\/+/g, "/")
                .replace("https:/", "https://");
              const response = await axios.get(fullUrl);
              const $ = cheerio.load(response.data);

              // Remove script and style tags
              $("script").remove();
              $("style").remove();

              // Extract content
              const mainContent = $(source.contentSelector).first();
              const pageTitle =
                cleanTitle($(source.titleSelector).first().text().trim()) ||
                cleanTitle($("title").text().trim()) ||
                (currentPath === "/"
                  ? "Overview"
                  : currentPath
                      .split("/")
                      .pop()
                      ?.split(".")[0]
                      .split("-")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1),
                      )
                      .join(" ") || "Untitled");

              const content = mainContent?.length ? mainContent : $("body");

              allDocs.push({
                title: pageTitle,
                url: fullUrl,
                content: content.text().replace(/\s+/g, " ").trim(),
                lastIndexed: Date.now(),
                section: source.section,
              });

              // Also check for important sections on the same page
              if (source.url === "docs.ar.io") {
                $("h2, h3").each((_, heading) => {
                  const id = $(heading).attr("id");
                  if (!id) return;

                  const sectionContent = $(heading).parent();
                  const sectionTitle = cleanTitle($(heading).text().trim());

                  if (sectionContent.length && sectionTitle) {
                    allDocs.push({
                      title: sectionTitle,
                      url: `${fullUrl}#${id}`,
                      content: sectionContent
                        .text()
                        .replace(/\s+/g, " ")
                        .trim(),
                      lastIndexed: Date.now(),
                      section: source.section,
                    });
                  }
                });
              }

              processedPaths.add(currentPath);

              // Add a small delay between requests to be nice to the servers
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
              console.error(
                `Failed to process ${currentPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
              continue;
            }
          }
        } catch (error) {
          console.error(
            `Failed to process ${source.url}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          continue;
        }
      }

      if (allDocs.length > 0) {
        await LocalStorage.setItem("arweave-docs", JSON.stringify(allDocs));
        await LocalStorage.setItem("docs-last-indexed", Date.now());
        setDocs(allDocs);
        setLastUpdateTime(new Date());

        showToast({
          style: Toast.Style.Success,
          title: "Documentation Indexed",
          message: `${allDocs.length} pages indexed`,
        });
      } else {
        throw new Error("No documentation pages were successfully indexed");
      }
    } catch (error) {
      console.error(
        `Indexing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      showToast({
        style: Toast.Style.Failure,
        title: "Indexing Failed",
        message: "Please check your internet connection and try again",
      });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }

  const filteredDocs = useMemo(() => {
    if (!docs) return { titleMatches: [], contentMatches: [] };

    if (!searchText) {
      // When no search, put everything in title matches
      const sorted = [...docs].sort((a, b) => {
        const sectionCompare = a.section.localeCompare(b.section);
        if (sectionCompare !== 0) return sectionCompare;
        return a.title.localeCompare(b.title);
      });
      return { titleMatches: sorted, contentMatches: [] };
    }

    const searchLower = searchText.toLowerCase();
    const titleMatches: DocEntry[] = [];
    const contentMatches: DocEntry[] = [];

    docs.forEach((doc) => {
      const titleScore = getSimilarityScore(doc.title, searchText);
      const sectionScore = getSimilarityScore(doc.section, searchText);
      const contentScore = getSimilarityScore(doc.content, searchText);

      // If title or section contains the search term, it goes in title matches
      if (
        doc.title.toLowerCase().includes(searchLower) ||
        doc.section.toLowerCase().includes(searchLower)
      ) {
        titleMatches.push({
          ...doc,
          relevanceScore: titleScore + sectionScore,
        });
      }
      // If only content contains the search term, it goes in content matches
      else if (doc.content.toLowerCase().includes(searchLower)) {
        contentMatches.push({ ...doc, relevanceScore: contentScore });
      }
    });

    // Sort both arrays by relevance score
    titleMatches.sort((a, b) => {
      const scoreCompare = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
      if (scoreCompare !== 0) return scoreCompare;

      const sectionCompare = a.section.localeCompare(b.section);
      if (sectionCompare !== 0) return sectionCompare;

      return a.title.localeCompare(b.title);
    });

    contentMatches.sort((a, b) => {
      const scoreCompare = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
      if (scoreCompare !== 0) return scoreCompare;

      const sectionCompare = a.section.localeCompare(b.section);
      if (sectionCompare !== 0) return sectionCompare;

      return a.title.localeCompare(b.title);
    });

    return { titleMatches, contentMatches };
  }, [docs, searchText]);

  const getLastUpdateText = () => {
    if (!lastUpdateTime) return "Never updated";
    const minutes = Math.floor((Date.now() - lastUpdateTime.getTime()) / 60000);
    if (minutes < 1) return "Updated just now";
    if (minutes === 1) return "Updated 1 minute ago";
    if (minutes < 60) return `Updated ${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "Updated 1 hour ago";
    if (hours < 24) return `Updated ${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Updated 1 day ago";
    return `Updated ${days} days ago`;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search documentation..."
      navigationTitle="Arweave Documentation"
      searchBarAccessory={
        <List.Dropdown
          tooltip={isRefreshing ? "Refreshing..." : getLastUpdateText()}
          storeValue={false}
          onChange={() => {}}
        >
          <List.Dropdown.Item
            title={getLastUpdateText()}
            value="status"
            icon={
              isRefreshing
                ? { source: Icon.Circle, tintColor: "yellow" }
                : lastUpdateTime &&
                    Date.now() - lastUpdateTime.getTime() < 24 * 60 * 60 * 1000
                  ? { source: Icon.Circle, tintColor: "green" }
                  : { source: Icon.Circle, tintColor: "red" }
            }
          />
        </List.Dropdown>
      }
    >
      {filteredDocs.titleMatches.length === 0 &&
      filteredDocs.contentMatches.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Documentation Found"
          description={
            searchText
              ? "Try a different search term"
              : "Documentation will be indexed on first run"
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Index"
                icon={Icon.ArrowClockwise}
                onAction={refreshDocs}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {filteredDocs.titleMatches.length > 0 && (
            <List.Section title="Title Matches">
              {filteredDocs.titleMatches.map((doc) => (
                <List.Item
                  key={`title-${doc.url}`}
                  title={doc.title}
                  subtitle={doc.section}
                  accessories={[
                    {
                      text: getLastUpdateText(),
                      tooltip: new Date(doc.lastIndexed).toLocaleString(),
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={getMarkdownContent(
                        doc,
                        searchText
                          .toLowerCase()
                          .split(/\s+/)
                          .filter((term) => term.length > 0),
                      )}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Section"
                            text={doc.section}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Last Updated"
                            text={getLastUpdateText()}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Link
                            title="Open in Browser"
                            target={doc.url}
                            text="View Online"
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.OpenInBrowser
                          title="Open in Browser"
                          url={doc.url}
                          shortcut={{ modifiers: ["cmd"], key: "return" }}
                        />
                        <Action.Push
                          title="Show Details"
                          icon={Icon.Sidebar}
                          target={
                            <Detail
                              markdown={getMarkdownContent(
                                doc,
                                searchText
                                  .toLowerCase()
                                  .split(/\s+/)
                                  .filter((term) => term.length > 0),
                              )}
                              navigationTitle={doc.title}
                              metadata={
                                <Detail.Metadata>
                                  <Detail.Metadata.Label
                                    title="Section"
                                    text={doc.section}
                                  />
                                  <Detail.Metadata.Label
                                    title="Last Updated"
                                    text={getLastUpdateText()}
                                  />
                                  <Detail.Metadata.Separator />
                                  <Detail.Metadata.Link
                                    title="Open in Browser"
                                    target={doc.url}
                                    text="View Online"
                                  />
                                </Detail.Metadata>
                              }
                              actions={
                                <ActionPanel>
                                  <Action.OpenInBrowser url={doc.url} />
                                  <Action.CopyToClipboard content={doc.url} />
                                </ActionPanel>
                              }
                            />
                          }
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                        />
                        <Action
                          title="Refresh Documentation"
                          icon={Icon.ArrowClockwise}
                          onAction={refreshDocs}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard
                          title="Copy URL"
                          content={doc.url}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {filteredDocs.contentMatches.length > 0 && (
            <List.Section title="Content Matches">
              {filteredDocs.contentMatches.map((doc) => (
                <List.Item
                  key={`content-${doc.url}`}
                  title={doc.title}
                  subtitle={doc.section}
                  accessories={[
                    {
                      text: getLastUpdateText(),
                      tooltip: new Date(doc.lastIndexed).toLocaleString(),
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={getMarkdownContent(
                        doc,
                        searchText
                          .toLowerCase()
                          .split(/\s+/)
                          .filter((term) => term.length > 0),
                      )}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Section"
                            text={doc.section}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Last Updated"
                            text={getLastUpdateText()}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Link
                            title="Open in Browser"
                            target={doc.url}
                            text="View Online"
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.OpenInBrowser
                          title="Open in Browser"
                          url={doc.url}
                          shortcut={{ modifiers: ["cmd"], key: "return" }}
                        />
                        <Action.Push
                          title="Show Details"
                          icon={Icon.Sidebar}
                          target={
                            <Detail
                              markdown={getMarkdownContent(
                                doc,
                                searchText
                                  .toLowerCase()
                                  .split(/\s+/)
                                  .filter((term) => term.length > 0),
                              )}
                              navigationTitle={doc.title}
                              metadata={
                                <Detail.Metadata>
                                  <Detail.Metadata.Label
                                    title="Section"
                                    text={doc.section}
                                  />
                                  <Detail.Metadata.Label
                                    title="Last Updated"
                                    text={getLastUpdateText()}
                                  />
                                  <Detail.Metadata.Separator />
                                  <Detail.Metadata.Link
                                    title="Open in Browser"
                                    target={doc.url}
                                    text="View Online"
                                  />
                                </Detail.Metadata>
                              }
                              actions={
                                <ActionPanel>
                                  <Action.OpenInBrowser url={doc.url} />
                                  <Action.CopyToClipboard content={doc.url} />
                                </ActionPanel>
                              }
                            />
                          }
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                        />
                        <Action
                          title="Refresh Documentation"
                          icon={Icon.ArrowClockwise}
                          onAction={refreshDocs}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard
                          title="Copy URL"
                          content={doc.url}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
