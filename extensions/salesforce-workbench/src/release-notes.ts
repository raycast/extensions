import { Cache } from "@raycast/api";
import { SalesforceReleaseNote, SalesforceReleaseNoteArticle, SalesforceReleaseNotesFeed } from "./types";

const HELP_ORIGIN = "https://help.salesforce.com";
const ROOT_TOPIC = "release-notes.salesforce_release_notes.htm";
const TOC_TOPIC = "release-notes.salesforce_release_notes_toc.htm";
const CACHE_KEY = "salesforce-release-notes-v1";
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const ARTICLE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ARTICLE_CACHE_PREFIX = "salesforce-release-note-article-v2";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 6 * 1024 * 1024;
const cache = new Cache({ namespace: "salesforce-release-notes" });
let currentAuraConfig: AuraConfig | undefined;

interface AuraConfig {
  fwuid: string;
  applicationVersion: string;
}

interface HelpRecord {
  Content__c?: string;
  Published_Date__c?: string;
  Title__c?: string;
  Version__c?: string;
  Help_Docs_Cache_Details__r?: Array<{ Content__c?: string }>;
}

interface HelpData {
  latestRNVersion?: string;
  type?: string;
  record?: HelpRecord;
}

interface AuraResponse {
  actions?: Array<{
    state?: string;
    returnValue?: { returnValue?: HelpData };
    error?: Array<{ message?: string }>;
  }>;
}

export interface LoadedReleaseNotes {
  feed: SalesforceReleaseNotesFeed;
  source: "live" | "cache" | "stale-cache";
}

export function releaseTitleForVersion(version: string): string {
  const release = Number.parseInt(version, 10);
  if (!Number.isFinite(release) || release < 252 || release % 2 !== 0) return `Salesforce Release ${version}`;
  const offset = (release - 252) / 2;
  const seasons = ["Winter", "Spring", "Summer"];
  const season = seasons[offset % seasons.length];
  const year = 25 + Math.floor(offset / seasons.length);
  return `${season} ’${String(year).padStart(2, "0")}`;
}

export function nextReleaseVersion(version: string): string {
  const release = Number.parseInt(version, 10);
  if (!Number.isFinite(release)) throw new Error(`Salesforce returned an invalid release version: ${version}`);
  return `${release + 2}.0.0`;
}

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteHelpUrl(value: string): string {
  try {
    const url = new URL(decodeHtml(value), HELP_ORIGIN);
    if (url.pathname.startsWith("/apex/HTViewHelpDoc")) url.pathname = "/s/articleView";
    return url.toString();
  } catch {
    return value;
  }
}

export function releaseNoteHtmlToMarkdown(html: string): string {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return body
    .replace(/<(script|style|nav)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<img\b([^>]*)>/gi, (_, attributes: string) => {
      const source = attributes.match(/src=["']([^"']+)["']/i)?.[1];
      if (!source) return "";
      const alt = decodeHtml(attributes.match(/alt=["']([^"']*)["']/i)?.[1] ?? "Release note image");
      return `\n\n![${alt}](${absoluteHelpUrl(source)})\n\n`;
    })
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) => {
      const text = decodeHtml(label);
      return text ? `[${text}](${absoluteHelpUrl(href)})` : "";
    })
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, value: string) => {
      return `\n\n${"#".repeat(Number(level))} ${decodeHtml(value)}\n\n`;
    })
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag: string, value: string) => `**${decodeHtml(value)}**`)
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag: string, value: string) => `*${decodeHtml(value)}*`)
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, value: string) => `\`${decodeHtml(value)}\``)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, value: string) => `\n- ${decodeHtml(value)}`)
    .replace(/<th\b[^>]*>([\s\S]*?)<\/th>/gi, (_, value: string) => ` **${decodeHtml(value)}** |`)
    .replace(/<td\b[^>]*>([\s\S]*?)<\/td>/gi, (_, value: string) => ` ${decodeHtml(value)} |`)
    .replace(/<tr\b[^>]*>|<\/tr>/gi, "\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|section|article|aside|ul|ol|table)>/gi, "\n\n")
    .replace(/<(p|div|section|article|aside|ul|ol|table)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function topicIdFromHref(href: string): string | undefined {
  const match = href.match(/[?&]id=([^&#]+)/i);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function parseReleaseNotesToc(
  html: string,
  releaseTitle: string,
  releaseVersion: string,
): SalesforceReleaseNote[] {
  const notes: SalesforceReleaseNote[] = [];
  const hierarchy = new Map<number, string>();
  const itemPattern = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(html))) {
    const attributes = match[1];
    const body = match[2];
    const levelMatch = attributes.match(/aria-level=["'](\d+)["']/i);
    const anchorMatch = body.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!levelMatch || !anchorMatch) continue;

    const level = Number.parseInt(levelMatch[1], 10);
    const title = decodeHtml(anchorMatch[2]);
    if (!title) continue;

    hierarchy.set(level, title);
    for (const key of [...hierarchy.keys()]) if (key > level) hierarchy.delete(key);

    const isLeaf = /slds-is-disabled/i.test(body) || /disabled=["']disabled["']/i.test(body);
    if (!isLeaf) continue;

    const topicId = topicIdFromHref(anchorMatch[1]);
    if (!topicId || topicId === ROOT_TOPIC || topicId === TOC_TOPIC) continue;

    const category = hierarchy.get(2) ?? "Salesforce Release Notes";
    const section = hierarchy.get(level - 1) ?? category;
    const releaseNumber = Number.parseInt(releaseVersion, 10);
    const url = new URL("/s/articleView", HELP_ORIGIN);
    url.searchParams.set("id", topicId);
    url.searchParams.set("language", "en_US");
    url.searchParams.set("release", String(releaseNumber));
    url.searchParams.set("type", "5");

    notes.push({
      id: topicId,
      title,
      url: url.toString(),
      category,
      section,
      level,
      releaseTitle,
      releaseVersion,
      isReleaseUpdate: /release update/i.test(title) || /_ru(?:_|\.|$)/i.test(topicId),
      isRetirement: /\b(retir(?:e[ds]?|ement|ing)|deprecated?|end[- ]of[- ](?:life|support))\b/i.test(title),
    });
  }

  return [...new Map(notes.map((note) => [note.id, note])).values()];
}

export function releaseNoteCategories(notes: SalesforceReleaseNote[]): string[] {
  return [...new Set(notes.map((note) => note.category))].sort((left, right) => left.localeCompare(right));
}

function extractAuraConfig(html: string): AuraConfig {
  const encodedFwuid = html.match(/fwuid%22%3A%22([^%]+)%22/i)?.[1];
  const encodedVersion = html.match(/APPLICATION%40markup%3A%2F%2Fsiteforce%3AcommunityApp%22%3A%22([^%]+)%22/i)?.[1];
  const plainFwuid = html.match(/["']fwuid["']\s*:\s*["']([^"']+)/i)?.[1];
  const plainVersion = html.match(/APPLICATION@markup:\/\/siteforce:communityApp["']\s*:\s*["']([^"']+)/i)?.[1];
  const fwuid = encodedFwuid ? decodeURIComponent(encodedFwuid) : plainFwuid;
  const applicationVersion = encodedVersion ? decodeURIComponent(encodedVersion) : plainVersion;
  if (!fwuid || !applicationVersion) {
    throw new Error(
      "Salesforce Help changed its public page format. Open the release notes in a browser and try again later.",
    );
  }
  return { fwuid, applicationVersion };
}

async function getAuraConfig(): Promise<AuraConfig> {
  if (currentAuraConfig) return currentAuraConfig;
  const latestPage = `${HELP_ORIGIN}/s/articleView?id=${ROOT_TOPIC}&language=en_US&release=latest&type=5`;
  const pageHtml = await fetchText(latestPage, {
    headers: { "user-agent": "Salesforce Workbench for Raycast" },
  });
  currentAuraConfig = extractAuraConfig(pageHtml);
  return currentAuraConfig;
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`Salesforce Help returned HTTP ${response.status}.`);
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_RESPONSE_BYTES)
      throw new Error("Salesforce Help returned more release-note data than expected.");
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
      throw new Error("Salesforce Help returned more release-note data than expected.");
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Salesforce Help did not respond within 20 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function getHelpData(config: AuraConfig, topic: string, release: string): Promise<HelpData> {
  const releaseNumber = Number.parseInt(release, 10);
  const pageUrl = new URL("/s/articleView", HELP_ORIGIN);
  pageUrl.searchParams.set("id", topic);
  pageUrl.searchParams.set("language", "en_US");
  pageUrl.searchParams.set("release", Number.isFinite(releaseNumber) ? String(releaseNumber) : release);
  pageUrl.searchParams.set("type", "5");

  const message = {
    actions: [
      {
        id: "1;a",
        descriptor: "aura://ApexActionController/ACTION$execute",
        callingDescriptor: "UNKNOWN",
        params: {
          namespace: "",
          classname: "Help_ArticleDataController",
          method: "getData",
          params: {
            articleParameters: {
              urlName: topic,
              language: "en_US",
              release,
              requestedArticleType: "HelpDocs",
              requestedArticleTypeNumber: "5",
            },
          },
          cacheable: false,
          isContinuation: false,
        },
      },
    ],
  };
  const context = {
    mode: "PROD",
    fwuid: config.fwuid,
    app: "siteforce:communityApp",
    loaded: { "APPLICATION@markup://siteforce:communityApp": config.applicationVersion },
    dn: [],
    globals: {},
    uad: true,
  };
  const body = new URLSearchParams({
    message: JSON.stringify(message),
    "aura.context": JSON.stringify(context),
    "aura.pageURI": `${pageUrl.pathname}${pageUrl.search}`,
    "aura.token": "null",
  });
  const responseText = await fetchText(`${HELP_ORIGIN}/s/sfsites/aura?r=1&aura.ApexAction.execute=1`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      referer: pageUrl.toString(),
      "user-agent": "Salesforce Workbench for Raycast",
    },
    body,
  });
  let response: AuraResponse;
  try {
    response = JSON.parse(responseText) as AuraResponse;
  } catch {
    throw new Error("Salesforce Help returned malformed release-note data.");
  }
  const action = response.actions?.[0];
  if (action?.state !== "SUCCESS") {
    throw new Error(action?.error?.[0]?.message ?? "Salesforce Help could not load release-note data.");
  }
  return action.returnValue?.returnValue ?? {};
}

function cachedFeed(): SalesforceReleaseNotesFeed | undefined {
  const value = cache.get(CACHE_KEY);
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as SalesforceReleaseNotesFeed;
    return parsed.notes?.length && parsed.fetchedAt ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function fetchLiveReleaseNotes(): Promise<SalesforceReleaseNotesFeed> {
  const config = await getAuraConfig();
  const latestLookup = await getHelpData(config, ROOT_TOPIC, "latest");
  const latestVersion = latestLookup.latestRNVersion;
  if (!latestVersion) throw new Error("Salesforce Help did not identify the latest release.");

  const previewVersion = nextReleaseVersion(latestVersion);
  const preview = await getHelpData(config, ROOT_TOPIC, previewVersion);
  const isPreview = preview.type !== "NotFound" && Boolean(preview.record);
  const selectedVersion = isPreview ? previewVersion : latestVersion;
  const root = isPreview ? preview : await getHelpData(config, ROOT_TOPIC, latestVersion);
  const releaseTitle =
    root.record?.Title__c?.replace(/^Salesforce\s+/i, "").replace(/\s+Release Notes$/i, "") ??
    releaseTitleForVersion(selectedVersion);
  const toc = await getHelpData(config, TOC_TOPIC, selectedVersion);
  const tocHtml = [
    toc.record?.Content__c,
    ...(toc.record?.Help_Docs_Cache_Details__r ?? []).map((item) => item.Content__c),
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" && !value.startsWith("Cannot populate due to large Document size"),
    )
    .join("");
  const notes = parseReleaseNotesToc(tocHtml, releaseTitle, selectedVersion);
  if (!notes.length) throw new Error("Salesforce Help returned an empty release-note index.");

  return {
    releaseTitle,
    releaseVersion: selectedVersion,
    isPreview,
    fetchedAt: new Date().toISOString(),
    publishedAt: root.record?.Published_Date__c,
    notes,
  };
}

function articleCacheKey(note: SalesforceReleaseNote): string {
  return `${ARTICLE_CACHE_PREFIX}:${note.releaseVersion}:${note.id}`;
}

function cachedArticle(note: SalesforceReleaseNote): SalesforceReleaseNoteArticle | undefined {
  const value = cache.get(articleCacheKey(note));
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as SalesforceReleaseNoteArticle;
    return parsed.markdown && parsed.fetchedAt ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function loadReleaseNoteArticle(
  note: SalesforceReleaseNote,
  forceRefresh = false,
): Promise<SalesforceReleaseNoteArticle> {
  const cached = cachedArticle(note);
  if (!forceRefresh && cached && Date.now() - new Date(cached.fetchedAt).getTime() < ARTICLE_CACHE_MAX_AGE_MS) {
    return cached;
  }
  try {
    const config = await getAuraConfig();
    const data = await getHelpData(config, note.id, note.releaseVersion);
    if (data.type === "NotFound" || !data.record) throw new Error("Salesforce Help could not find this release note.");
    const html = [
      data.record.Content__c,
      ...(data.record.Help_Docs_Cache_Details__r ?? []).map((item) => item.Content__c),
    ]
      .filter(
        (value): value is string =>
          typeof value === "string" && !value.startsWith("Cannot populate due to large Document size"),
      )
      .join("");
    let body = releaseNoteHtmlToMarkdown(html);
    const title = data.record.Title__c ?? note.title;
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const duplicateHeading = new RegExp(`(?:^|\\n)#{1,6}\\s+${escapedTitle}\\s*(?:\\n|$)`, "i");
    const headingMatch = duplicateHeading.exec(body);
    if (headingMatch && (headingMatch.index === 0 || /you are here:/i.test(body.slice(0, headingMatch.index)))) {
      body = body.slice(headingMatch.index + headingMatch[0].length).trim();
    }
    if (!body) throw new Error("Salesforce Help returned an empty release note.");
    const article: SalesforceReleaseNoteArticle = {
      id: note.id,
      title,
      markdown: `# ${title}\n\n**Release:** ${note.releaseTitle}  \n**Category:** ${note.category}  \n**Section:** ${note.section}\n\n---\n\n${body}`,
      fetchedAt: new Date().toISOString(),
      publishedAt: data.record.Published_Date__c,
    };
    cache.set(articleCacheKey(note), JSON.stringify(article));
    return article;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

export async function loadReleaseNotes(forceRefresh = false): Promise<LoadedReleaseNotes> {
  const cached = cachedFeed();
  if (!forceRefresh && cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_MAX_AGE_MS) {
    return { feed: cached, source: "cache" };
  }
  try {
    const feed = await fetchLiveReleaseNotes();
    cache.set(CACHE_KEY, JSON.stringify(feed));
    return { feed, source: "live" };
  } catch (error) {
    if (cached) return { feed: cached, source: "stale-cache" };
    throw error;
  }
}

export function officialReleaseNotesUrl(releaseVersion?: string): string {
  const url = new URL("/s/articleView", HELP_ORIGIN);
  url.searchParams.set("id", ROOT_TOPIC);
  url.searchParams.set("language", "en_US");
  url.searchParams.set("release", releaseVersion ? String(Number.parseInt(releaseVersion, 10)) : "latest");
  url.searchParams.set("type", "5");
  return url.toString();
}
