import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { ResourceExportActions } from "../actions/ResourceExportActions";
import { FileStatus, SpiderFile, useSitemap } from "../hooks/useSitemap";
import { LIMITS } from "../utils/config";
import { Exportable, rowsFromParsedSitemap } from "../utils/exportUtils";
import {
  DEFAULT_PARSE_LIMIT,
  filterEntries,
  formatLastmod,
  pageTitle,
  SitemapPage,
  SitemapRef,
} from "../utils/sitemapParse";
import { GuardedDig } from "./GuardedDig";

export interface SitemapListViewProps {
  /** The sitemap file to show: the site's `/sitemap.xml`, or a child reached by drilling down. */
  url: string;
  /**
   * The site being dug — what `fetchPageSuppliedUrl` measures child URLs
   * against. Defaults to `url`, which is on the dug host for the root sitemap.
   */
  siteUrl?: string;
}

const MB = 1024 * 1024;

function plural(count: number, noun: string): string {
  return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function fileName(url: string): string {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).pop() || "sitemap.xml";
  } catch {
    return "sitemap.xml";
  }
}

function ago(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

/** A direct child's row, summarizing every file reached through it. */
interface ChildSummary {
  self: FileStatus;
  pages: number;
  sitemaps: number;
  pending: number;
  notSearched: number;
  truncated: number;
  /** Pages in loaded files that the spider's page limit kept out of search. */
  unsearched: number;
}

function summarize(files: ReadonlyMap<string, SpiderFile>): Map<string, ChildSummary> {
  const byTop = new Map<string, ChildSummary>();
  for (const file of files.values()) {
    let summary = byTop.get(file.top);
    if (!summary) {
      summary = {
        self: { status: "queued" },
        pages: 0,
        sitemaps: 0,
        pending: 0,
        notSearched: 0,
        truncated: 0,
        unsearched: 0,
      };
      byTop.set(file.top, summary);
    }
    if (file.url === file.top) summary.self = file.state;
    const { state } = file;
    if (state.status === "queued" || state.status === "loading") summary.pending++;
    else if (state.status === "failed" || state.status === "skipped") summary.notSearched++;
    else {
      summary.pages += state.pages;
      if (file.url !== file.top) summary.sitemaps++;
      if (state.truncated) summary.truncated++;
      summary.unsearched += state.unsearched;
    }
  }
  return byTop;
}

function childAccessories(summary: ChildSummary | undefined, lastmod: string | undefined): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  const self = summary?.self ?? { status: "queued" };

  if (self.status === "failed") {
    accessories.push({ tag: { value: "Couldn't load", color: Color.Red }, tooltip: self.error });
  } else if (self.status === "skipped") {
    accessories.push({
      tag: { value: "Not loaded", color: Color.SecondaryText },
      tooltip: `${self.reason}. Open it to load it on its own.`,
    });
  } else if (self.status === "queued" || self.status === "loading") {
    accessories.push({ text: self.status === "queued" ? "Queued" : "Loading…" });
  } else if (summary) {
    if (summary.pending > 0) accessories.push({ text: "Loading…" });
    if (summary.notSearched > 0) {
      accessories.push({
        tag: { value: `${summary.notSearched} not loaded`, color: Color.Orange },
        tooltip: "Sitemaps nested in this one that failed or were over a limit. Their pages were not searched.",
      });
    }
    if (summary.truncated > 0) {
      accessories.push({
        tag: { value: "Truncated", color: Color.Orange },
        tooltip: `Only the first ${LIMITS.SITEMAP_MAX_BYTES / MB} MB or ${DEFAULT_PARSE_LIMIT.toLocaleString()} entries were read`,
      });
    }
    if (summary.unsearched > 0) {
      accessories.push({
        tag: { value: "Partly searched", color: Color.Orange },
        tooltip: `${plural(summary.unsearched, "page")} came after the ${LIMITS.SITEMAP_SPIDER_MAX_PAGES.toLocaleString()}-page limit and weren't searched. Open it to search it on its own.`,
      });
    }
    const counts = [plural(summary.pages, "page")];
    if (summary.sitemaps > 0) counts.unshift(plural(summary.sitemaps, "sitemap"));
    accessories.push({ text: counts.join(" · ") });
  }

  if (lastmod) accessories.push({ text: formatLastmod(lastmod), tooltip: `Last modified: ${lastmod}` });
  return accessories;
}

function pageAccessories(page: SitemapPage): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (page.lastmod) accessories.push({ text: formatLastmod(page.lastmod), tooltip: `Last modified: ${page.lastmod}` });
  if (page.changefreq) accessories.push({ text: page.changefreq, tooltip: "Change frequency" });
  if (page.priority) accessories.push({ text: page.priority, tooltip: "Priority" });
  return accessories;
}

/** "2,000 of 14,320" when the list is cut, the bare count when it is not. */
function countLabel(shown: number, total: number): string {
  return shown < total ? `${shown.toLocaleString()} of ${total.toLocaleString()}` : total.toLocaleString();
}

export function SitemapListView({ url, siteUrl = url }: SitemapListViewProps) {
  const [query, setQuery] = useState("");
  const { root, files, pages, pageCount, pagesCapped, spidering, reload } = useSitemap(url, siteUrl);
  const baseHost = hostOf(url);
  const name = fileName(url);

  const file = root.status === "loaded" ? root.file : undefined;
  const parsed = file?.parsed;

  const resource: Exportable | undefined = useMemo(
    () =>
      file && parsed
        ? { name, text: file.text, rows: rowsFromParsedSitemap(parsed), language: "xml" }
        : file
          ? { name, text: file.text, language: "xml" }
          : undefined,
    [file, parsed, name],
  );

  // A urlset's pages are its own; an index's are whatever the spider gathered.
  const allPages = parsed?.kind === "urlset" ? parsed.pages : pages;
  const pageMatches = useMemo(
    () => filterEntries(allPages, query, LIMITS.SITEMAP_RENDER_CAP),
    [allPages, pageCount, query],
  );
  const sitemapMatches = useMemo(
    () =>
      parsed?.kind === "index"
        ? filterEntries(parsed.sitemaps, query, LIMITS.SITEMAP_RENDER_CAP)
        : { items: [] as SitemapRef[], total: 0 },
    [parsed, query],
  );
  const summaries = useMemo(() => summarize(files), [files]);

  // What search did NOT cover, in words — shown wherever an empty or short
  // result could otherwise be read as "the site has no such page".
  const coverage = useMemo(() => {
    const notes: string[] = [];
    let failed = 0;
    let skipped = 0;
    let pending = 0;
    let truncated = 0;
    for (const { state } of files.values()) {
      if (state.status === "failed") failed++;
      else if (state.status === "skipped") skipped++;
      else if (state.status === "queued" || state.status === "loading") pending++;
      else if (state.truncated) truncated++;
    }
    if (pending > 0) notes.push(`${plural(pending, "sitemap")} still loading`);
    if (failed > 0) notes.push(`${plural(failed, "sitemap")} couldn't be loaded`);
    if (skipped > 0) notes.push(`${plural(skipped, "sitemap")} over a limit weren't loaded`);
    if (truncated > 0) notes.push(`${plural(truncated, "sitemap")} were only partly read`);
    // Two different limits, named separately: raising the wrong one fixes nothing.
    if (file?.truncated) notes.push(`only the first ${LIMITS.SITEMAP_MAX_BYTES / MB} MB of this file was read`);
    if (parsed && parsed.kind !== "invalid" && parsed.capped) {
      notes.push(`only the first ${DEFAULT_PARSE_LIMIT.toLocaleString()} entries of this file were parsed`);
    }
    if (pagesCapped) notes.push(`collection stopped at ${LIMITS.SITEMAP_SPIDER_MAX_PAGES.toLocaleString()} pages`);
    return notes.length > 0 ? `Not searched: ${notes.join("; ")}.` : undefined;
  }, [files, file, parsed, pagesCapped]);

  const cachedNote = file?.fromCache ? ` · cached ${ago(file.fetchedAt)}` : "";
  const navigationTitle = `${name}${cachedNote}`;

  // `standalone` is an EmptyView's panel, where no row action owns Common.Copy,
  // so Copy Sitemap URL takes it. In a row panel, the row's Copy URL has it.
  const fileActions = (standalone: boolean) => (
    <>
      <ActionPanel.Section title={name}>
        <Action.OpenInBrowser
          title="Open Sitemap in Browser"
          url={url}
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
        <Action.CopyToClipboard
          title="Copy Sitemap URL"
          content={url}
          icon={Icon.Link}
          shortcut={standalone ? Keyboard.Shortcut.Common.Copy : undefined}
        />
        <Action
          title="Reload Sitemap"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={reload}
        />
      </ActionPanel.Section>
      <ResourceExportActions resource={resource} textCopyShortcut={false} />
    </>
  );

  if (root.status === "loading") {
    return <List isLoading navigationTitle={name} searchBarPlaceholder="Loading sitemap…" />;
  }

  if (root.status === "failed") {
    return (
      <List navigationTitle={name}>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Couldn't load the sitemap"
          description={`${root.error}\n\nThe server may be blocking requests, or the file may have moved. Try opening it in your browser.`}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={reload}
              />
              <Action.OpenInBrowser url={url} shortcut={Keyboard.Shortcut.Common.Open} />
              <Action.CopyToClipboard
                title="Copy Error"
                content={root.error}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!parsed || parsed.kind === "invalid") {
    // With no root element in a truncated read, the answer never arrived: the
    // root may simply sit past the cut. That is "couldn't tell", not "isn't".
    const undetermined = !parsed?.root && file?.truncated;
    const answer = parsed?.root ? `<${parsed.root}>` : "something that isn't XML";
    return (
      <List navigationTitle={name}>
        <List.EmptyView
          icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
          title={undetermined ? "Couldn't tell whether this is a sitemap" : "This isn't a sitemap"}
          description={
            undetermined
              ? `The first ${LIMITS.SITEMAP_MAX_BYTES / MB} MB held no root element, and the rest of the file wasn't read.`
              : `The server answered with ${answer}, not <urlset> or <sitemapindex>.`
          }
          actions={<ActionPanel>{fileActions(true)}</ActionPanel>}
        />
      </List>
    );
  }

  const isIndex = parsed.kind === "index";
  const totalPages = allPages.length;
  const searchBarPlaceholder = isIndex
    ? `Search ${plural(totalPages, "page")} in ${plural(parsed.sitemaps.length, "sitemap")}…`
    : `Search ${plural(totalPages, "page")}…`;

  const loadedFiles = [...files.values()].filter((f) => f.state.status === "loaded").length;
  // While spidering, progress. After, a result count that admits partial
  // coverage — a short result list is otherwise read as the whole answer.
  const pagesSubtitle = [
    countLabel(pageMatches.items.length, pageMatches.total),
    spidering
      ? `${loadedFiles} of ${plural(files.size, "sitemap")} loaded`
      : coverage
        ? "not everything was searched"
        : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  const nothingShown = pageMatches.items.length === 0 && sitemapMatches.items.length === 0;

  return (
    <List
      isLoading={spidering}
      navigationTitle={navigationTitle}
      searchBarPlaceholder={searchBarPlaceholder}
      filtering={false}
      onSearchTextChange={setQuery}
      throttle
    >
      {nothingShown && !spidering && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={
            query
              ? `Nothing matches “${query}”`
              : isIndex
                ? "This sitemap index lists no sitemaps"
                : "This sitemap lists no pages"
          }
          description={coverage}
          actions={<ActionPanel>{fileActions(true)}</ActionPanel>}
        />
      )}

      {isIndex && sitemapMatches.items.length > 0 && (
        <List.Section
          title="Sitemaps"
          subtitle={[
            countLabel(sitemapMatches.items.length, sitemapMatches.total),
            parsed.capped || file?.truncated ? "index only partly read" : undefined,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          {sitemapMatches.items.map((child, index) => (
            <List.Item
              key={`${index}:${child.loc}`}
              icon={Icon.Map}
              title={pageTitle(child.loc, baseHost)}
              accessories={childAccessories(summaries.get(child.loc), child.lastmod)}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="View Sitemap"
                      icon={Icon.List}
                      target={<SitemapListView url={child.loc} siteUrl={siteUrl} />}
                    />
                    <Action.OpenInBrowser url={child.loc} />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={child.loc}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  </ActionPanel.Section>
                  {fileActions(false)}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {pageMatches.items.length > 0 && (
        <List.Section title="Pages" subtitle={pagesSubtitle}>
          {pageMatches.items.map((page, index) => (
            <List.Item
              key={`${index}:${page.loc}`}
              icon={Icon.Document}
              title={pageTitle(page.loc, baseHost)}
              accessories={pageAccessories(page)}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="Open Page" url={page.loc} />
                    <Action.Push
                      title="Dig This URL"
                      icon={Icon.MagnifyingGlass}
                      target={<GuardedDig url={page.loc} siteUrl={siteUrl} />}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={page.loc}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  </ActionPanel.Section>
                  {fileActions(false)}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
