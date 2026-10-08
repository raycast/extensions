import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

const TECHMEME_ORIGIN = "https://www.techmeme.com";
const HOME_URL = `${TECHMEME_ORIGIN}/`;
const RIVER_URL = `${TECHMEME_ORIGIN}/river`;
const USER_AGENT = "Raycast Techmeme Extension";
const MAX_DETAIL_LINKS_PER_GROUP = 8;
const TECHMEME_TIME_ZONE = "America/New_York";
const FETCH_TIMEOUT_MS = 10_000;
const OPTIONAL_ENRICHMENT_WAIT_MS = 1_500;
const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

type Selection = Cheerio<AnyNode>;

export type LinkItem = {
  title: string;
  url: string;
  source?: string;
};

export type LinkGroup = {
  title: string;
  links: LinkItem[];
};

export type SocialLinks = {
  x?: string;
  mastodon?: string;
  threads?: string;
  bluesky?: string;
};

export type Story = {
  id: string;
  rank: number;
  headline: string;
  articleUrl: string;
  permalink: string;
  source: string;
  summary?: string;
  imageUrl?: string;
  timeLabel?: string;
  dateLabel?: string;
  publishedLabel?: string;
  publishedAt?: string;
  clusterRank?: number;
  clusterPosition?: number;
  clusterSize?: number;
  sections: LinkGroup[];
  social: SocialLinks;
};

export type TechmemeData = {
  frontpage: Story[];
  river: Story[];
  lastUpdated: string;
};

export const EMPTY_TECHMEME_DATA: TechmemeData = {
  frontpage: [],
  river: [],
  lastUpdated: "",
};

export async function fetchTechmeme(): Promise<TechmemeData> {
  const lastUpdated = new Date();
  const home = fetchText(HOME_URL);
  const river = fetchText(RIVER_URL);
  const homeResult = await settle(home);
  let riverResult = await withDeadline(settle(river), OPTIONAL_ENRICHMENT_WAIT_MS);

  if (homeResult.status === "fulfilled" && riverResult?.status === "fulfilled") {
    return parseTechmemeHtml(homeResult.value, riverResult.value, lastUpdated);
  }

  if (homeResult.status === "fulfilled") {
    return parseTechmemeHtml(homeResult.value, "", lastUpdated);
  }

  if (riverResult?.status === "fulfilled") {
    return parseTechmemeRiverHtml(riverResult.value, lastUpdated);
  }

  if (!riverResult) {
    const lateRiverResult = await settle(river);

    if (lateRiverResult.status === "fulfilled") {
      return parseTechmemeRiverHtml(lateRiverResult.value, lastUpdated);
    }

    riverResult = lateRiverResult;
  }

  throw new Error(
    `Could not load Techmeme. Front page: ${errorMessage(homeResult.reason)}. River: ${errorMessage(riverResult?.reason)}.`,
  );
}

export async function fetchTechmemeRiver(): Promise<TechmemeData> {
  const lastUpdated = new Date();
  const river = fetchText(RIVER_URL);
  const home = fetchText(HOME_URL);
  const riverResult = await settle(river);

  if (riverResult.status === "rejected") {
    throw new Error(`Could not load Techmeme River. ${errorMessage(riverResult.reason)}.`);
  }

  const homeResult = await withDeadline(settle(home), OPTIONAL_ENRICHMENT_WAIT_MS);

  if (homeResult?.status === "fulfilled") {
    return parseTechmemeHtml(homeResult.value, riverResult.value, lastUpdated);
  }

  return parseTechmemeRiverHtml(riverResult.value, lastUpdated);
}

export function parseTechmemeHtml(homeHtml: string, riverHtml: string, lastUpdated = new Date()): TechmemeData {
  const river = parseRiver(riverHtml);
  const riverById = new Map(river.map((story) => [story.id, story]));
  const frontpage = parseFrontpage(homeHtml, riverById);
  const frontpageById = new Map(frontpage.map((story) => [story.id, story]));

  return {
    frontpage,
    river: river.map((story) => enrichRiverStory(story, frontpageById.get(story.id))),
    lastUpdated: lastUpdated.toISOString(),
  };
}

export function parseTechmemeRiverHtml(riverHtml: string, lastUpdated = new Date()): TechmemeData {
  return {
    frontpage: [],
    river: parseRiver(riverHtml),
    lastUpdated: lastUpdated.toISOString(),
  };
}

export async function fetchLatestStory(): Promise<Story> {
  const river = parseRiver(await fetchText(RIVER_URL));

  if (!river[0]) {
    throw new Error("Techmeme did not return any river stories.");
  }

  return river[0];
}

export function searchTechmemeUrl(query: string): string {
  return `${TECHMEME_ORIGIN}/search/query?q=${encodeURIComponent(query.trim())}`;
}

export function filterStories(stories: Story[], searchText: string): Story[] {
  const tokens = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (!tokens.length) {
    return stories;
  }

  return stories.filter((story) => {
    const text = searchableText(story);

    return tokens.every((token) => text.includes(token));
  });
}

export function formatStoryAsMarkdown(story: Story): string {
  const source = story.source ? `${story.source}: ` : "";
  return `[${escapeMarkdownLinkText(story.headline)}](${markdownLinkTarget(story.articleUrl)})\n\n${escapeMarkdownText(source)}${story.permalink}`;
}

export function formatStoryDetailMarkdown(story: Story): string {
  const lines: string[] = [];

  lines.push(`# ${escapeMarkdownText(story.headline)}`, "");

  const byline = [story.source, story.publishedLabel].filter(Boolean).join(" - ");
  if (byline) {
    lines.push(`**${escapeMarkdownText(byline)}**`, "");
  }

  if (story.summary) {
    lines.push(escapeMarkdownText(story.summary), "");
  }

  lines.push(
    `[Original story](${markdownLinkTarget(story.articleUrl)})`,
    `[Techmeme permalink](${markdownLinkTarget(story.permalink)})`,
  );

  for (const group of story.sections) {
    if (!group.links.length) {
      continue;
    }

    lines.push("", `## ${escapeMarkdownText(group.title)}`);

    for (const link of group.links.slice(0, MAX_DETAIL_LINKS_PER_GROUP)) {
      const source = link.source ? ` - ${escapeMarkdownText(link.source)}` : "";
      lines.push(`- [${escapeMarkdownLinkText(truncate(link.title, 170))}](${markdownLinkTarget(link.url)})${source}`);
    }

    if (group.links.length > MAX_DETAIL_LINKS_PER_GROUP) {
      lines.push(
        `- [${group.links.length - MAX_DETAIL_LINKS_PER_GROUP} more on Techmeme](${markdownLinkTarget(story.permalink)})`,
      );
    }
  }

  return lines.join("\n");
}

function enrichRiverStory(story: Story, frontpageStory?: Story): Story {
  if (!frontpageStory) {
    return story;
  }

  return {
    ...story,
    summary: frontpageStory.summary ?? story.summary,
    imageUrl: frontpageStory.imageUrl ?? story.imageUrl,
    clusterRank: frontpageStory.clusterRank,
    clusterPosition: frontpageStory.clusterPosition,
    clusterSize: frontpageStory.clusterSize,
    sections: frontpageStory.sections.length ? frontpageStory.sections : story.sections,
    social: {
      ...story.social,
      ...frontpageStory.social,
    },
  };
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timed out after ${FETCH_TIMEOUT_MS / 1000}s loading ${url}`);
    }

    throw new Error(`Failed loading ${url}: ${errorMessage(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

function parseFrontpage(html: string, riverById: Map<string, Story>): Story[] {
  const $ = cheerio.load(html);
  const stories: Story[] = [];
  const seen = new Set<string>();

  $(".clus").each((clusterIndex, clusterElement) => {
    const cluster = $(clusterElement);
    const itemElements = [
      ...cluster.find("> .itc1 > .itc2 > .item").toArray(),
      ...cluster.find("> .relitems > .itc1 > .itc2 > .item").toArray(),
    ];

    itemElements.forEach((itemElement, itemIndex) => {
      const item = $(itemElement);
      const share = item.find("span[pml]").first();
      const id = share.attr("pml");

      if (!id || seen.has(id)) {
        return;
      }

      const body = item.find("> .ii").first();
      const titleLink = body.find("strong a").first();
      const headline = cleanText(titleLink.text());
      const articleUrl = toAbsoluteUrl(titleLink.attr("href"));

      if (!headline || !articleUrl) {
        return;
      }

      seen.add(id);

      const riverStory = riverById.get(id);
      const source = sourceFromCite(item.find("> table cite").first().text()) || riverStory?.source || "Techmeme";
      const summary = parseSummary(body);
      const imageUrl = toAbsoluteUrl(item.find(".ill img").first().attr("src"));
      const sections = parseStorySections($, item);

      stories.push({
        id,
        rank: stories.length + 1,
        headline,
        articleUrl,
        permalink: permalinkFromId(id),
        source,
        summary: summary || riverStory?.summary,
        imageUrl,
        timeLabel: riverStory?.timeLabel,
        dateLabel: riverStory?.dateLabel,
        publishedLabel: riverStory?.publishedLabel,
        publishedAt: riverStory?.publishedAt,
        clusterRank: clusterIndex + 1,
        clusterPosition: itemIndex + 1,
        clusterSize: itemElements.length,
        sections,
        social: parseSocialLinks(share),
      });
    });
  });

  return stories;
}

function parseRiver(html: string): Story[] {
  const $ = cheerio.load(html);
  const stories: Story[] = [];

  $("#countercol table").each((_, tableElement) => {
    const table = $(tableElement);
    const dateLabel = cleanText(table.prevAll("h2").first().text());

    table.find("tr.ritem").each((_, rowElement) => {
      const row = $(rowElement);
      const share = row.find(".rshr[pml]").first();
      const id = share.attr("pml");
      const content = row.find("td").eq(1);
      const titleLink = content.find("a").last();
      const headline = cleanText(titleLink.text());
      const articleUrl = toAbsoluteUrl(titleLink.attr("href"));

      if (!id || !headline || !articleUrl) {
        return;
      }

      const easternTime = cleanText(
        row
          .find("td")
          .first()
          .text()
          .replace(/\u2022/g, ""),
      );
      const publishedAt = parseTechmemeDate(dateLabel, easternTime);
      const timeLabel = formatLocalTime(publishedAt);
      const publishedLabel = formatLocalDateTime(publishedAt);
      const source = sourceFromCite(content.find("cite").first().text()) || "Techmeme";

      stories.push({
        id,
        rank: stories.length + 1,
        headline,
        articleUrl,
        permalink: permalinkFromId(id),
        source,
        timeLabel,
        dateLabel: formatLocalDate(publishedAt) || dateLabel,
        publishedLabel,
        publishedAt: publishedAt?.toISOString(),
        sections: [],
        social: parseSocialLinks(share),
      });
    });
  });

  return stories;
}

function parseTechmemeDate(dateLabel: string, timeLabel: string): Date | undefined {
  const dateMatch = dateLabel.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  const timeMatch = timeLabel.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!dateMatch || !timeMatch) {
    return undefined;
  }

  const month = MONTHS[dateMatch[1].toLowerCase()];
  if (month === undefined) {
    return undefined;
  }

  let hour = Number(timeMatch[1]);
  if (timeMatch[3].toUpperCase() === "PM" && hour !== 12) {
    hour += 12;
  } else if (timeMatch[3].toUpperCase() === "AM" && hour === 12) {
    hour = 0;
  }

  return zonedDateTimeToDate({
    timeZone: TECHMEME_TIME_ZONE,
    year: Number(dateMatch[3]),
    month,
    day: Number(dateMatch[2]),
    hour,
    minute: Number(timeMatch[2]),
  });
}

function zonedDateTimeToDate(input: {
  timeZone: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): Date {
  const utcGuess = Date.UTC(input.year, input.month, input.day, input.hour, input.minute);
  const offset = getTimeZoneOffset(new Date(utcGuess), input.timeZone);
  const utc = utcGuess - offset;
  const adjustedOffset = getTimeZoneOffset(new Date(utc), input.timeZone);

  return new Date(utcGuess - adjustedOffset);
}

function getTimeZoneOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = values.hour === "24" ? 0 : Number(values.hour);
  const asUTC = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    hour,
    Number(values.minute),
    Number(values.second),
  );

  return asUTC - date.getTime();
}

function formatLocalTime(date?: Date): string {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatLocalDate(date?: Date): string | undefined {
  if (!date) {
    return undefined;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatLocalDateTime(date?: Date): string | undefined {
  if (!date) {
    return undefined;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function parseSummary(body: Selection): string | undefined {
  const clone = body.clone();
  clone.find("strong").remove();

  return cleanSummaryText(clone.text());
}

function parseStorySections($: CheerioAPI, item: Selection): LinkGroup[] {
  const itemId = item.attr("id");
  const idParts = itemId?.match(/^(.+)i(.+)$/);
  const empty = item.find("__raycast_empty__");
  const expanded = idParts ? item.find(`[id="${idParts[1]}p${idParts[2]}"]`) : empty;
  const collapsed = idParts ? item.find(`[id="${idParts[1]}d${idParts[2]}"]`) : empty;
  const container = expanded.length ? expanded : collapsed;
  const groups: LinkGroup[] = [];

  container.find("> .dbpt").each((_, groupElement) => {
    const group = $(groupElement);
    const title = cleanText(group.find("> .drhed").first().text() || group.find(".drhed").first().text())
      .replace(/:$/, "")
      .trim();
    const links = parseGroupLinks($, group);

    if (title && links.length) {
      groups.push({ title, links });
    }
  });

  return groups;
}

function parseGroupLinks($: CheerioAPI, group: Selection): LinkItem[] {
  const links: LinkItem[] = [];
  const seen = new Set<string>();
  const rows = group.find("> .di");

  if (rows.length) {
    rows.each((_, rowElement) => {
      const row = $(rowElement);
      const anchors = row.find("a");
      const titleLink = anchors.last();
      const url = toAbsoluteUrl(titleLink.attr("href"));
      const title = cleanLinkTitle(titleLink.text());

      if (!url || !title || seen.has(url)) {
        return;
      }

      seen.add(url);
      links.push({
        title,
        url,
        source: sourceFromCite(row.find("cite").first().text()),
      });
    });

    return links;
  }

  group.find(".bls a").each((_, linkElement) => {
    const link = $(linkElement);
    const url = toAbsoluteUrl(link.attr("href"));
    const title = cleanLinkTitle(link.text());

    if (!url || !title || seen.has(url)) {
      return;
    }

    seen.add(url);
    links.push({ title, url });
  });

  return links;
}

function parseSocialLinks(share: Selection): SocialLinks {
  return {
    x: toAbsoluteUrl(share.attr("twurl")),
    mastodon: toAbsoluteUrl(share.attr("mdurl")),
    threads: toAbsoluteUrl(share.attr("thurl")),
    bluesky: toAbsoluteUrl(share.attr("bsurl")),
  };
}

function sourceFromCite(value: string): string | undefined {
  return cleanText(value).replace(/:$/, "") || undefined;
}

function permalinkFromId(id: string): string {
  const match = id.match(/^(\d{6})p(\d+)$/);

  if (!match) {
    return HOME_URL;
  }

  return `${TECHMEME_ORIGIN}/${match[1]}/p${match[2]}#a${id}`;
}

function toAbsoluteUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url, TECHMEME_ORIGIN);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return undefined;
    }

    return parsedUrl.toString();
  } catch {
    return undefined;
  }
}

function cleanText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSummaryText(value: string): string {
  const text = cleanText(value)
    .replace(/^(?:[-\u2013\u2014]\s*)+/, "")
    .trim();

  if (/^Video Player is loading\./i.test(text)) {
    return "";
  }

  return stripMediaLabel(text);
}

function cleanLinkTitle(value: string): string {
  return stripMediaLabel(cleanText(value));
}

function stripMediaLabel(value: string): string {
  return value.replace(/\s*(?:\[(?:embedded\s*post|image|video)\]\s*)+$/gi, "").trim();
}

function searchableText(story: Story): string {
  return [
    story.headline,
    story.source,
    story.summary,
    story.publishedLabel,
    ...story.sections.flatMap((group) => [group.title, ...group.links.flatMap((link) => [link.title, link.source])]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function escapeMarkdownText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}[\]])/g, "\\$1")
    .replace(/^(\s*)(#{1,6})(\s+)/gm, "$1\\$2$3")
    .replace(/^(\s*)([-+*])(\s+)/gm, "$1\\$2$3")
    .replace(/^(\s*)(>)(\s?)/gm, "$1\\$2$3")
    .replace(/^(\s*)(\d+[.)])(\s+)/gm, "$1\\$2$3");
}

function escapeMarkdownLinkText(value: string): string {
  return escapeMarkdownText(value);
}

function markdownLinkTarget(url: string): string {
  return `<${url.replace(/>/g, "%3E")}>`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function settle<T>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
  try {
    return { status: "fulfilled", value: await promise };
  } catch (reason) {
    return { status: "rejected", reason };
  }
}

async function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  let timeout: number | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timeout = setTimeout(resolve, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function truncate(value: string, length: number): string {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length - 1).trimEnd()}...`;
}
