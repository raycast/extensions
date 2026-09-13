#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_ORIGIN = "https://opensource.guide";
const SITEMAP_URL = `${SOURCE_ORIGIN}/sitemap.xml`;
const HOME_URL = `${SOURCE_ORIGIN}/`;
const ROBOTS_URL = `${SOURCE_ORIGIN}/robots.txt`;
const USER_AGENT = "oss-guide-of-the-day/1.0 (+https://github.com/Mona-kecil/oss-guide-of-the-day)";
const DEFAULT_DELAY_MS = 1_250;
const REQUEST_TIMEOUT_MS = 30_000;
const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DATA_PATH = resolve(ROOT, "src/data/guides.json");
const INDEX_PATH = resolve(ROOT, "scripts/source-index.json");
const TAXONOMY_PATH = resolve(ROOT, "src/data/taxonomy.json");

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: node scripts/scrape-guides.mjs [--write] [--delay-ms=N]

Fetches robots.txt, the sitemap, and the English guide pages at a slow rate.
It validates the curated summaries in src/data/guides.json and, with --write,
updates the compact heading index at scripts/source-index.json. Summaries are
kept human-written rather than copied from the source pages.`);
  process.exit(0);
}

const requestedDelay = Number(process.argv.find((arg) => arg.startsWith("--delay-ms="))?.split("=")[1]);
const delayMs = Number.isFinite(requestedDelay) ? Math.max(DEFAULT_DELAY_MS, requestedDelay) : DEFAULT_DELAY_MS;
const shouldWrite = args.has("--write");

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html, text/plain, application/xml",
        "Accept-Language": "en",
        "User-Agent": USER_AGENT,
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${url} returned HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function decodeEntities(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => {
      const number = code.toLowerCase().startsWith("x") ? Number.parseInt(code.slice(1), 16) : Number.parseInt(code, 10);
      return Number.isNaN(number) ? _ : String.fromCodePoint(number);
    })
    .replace(/&([a-z]+);/gi, (match, name) => namedEntities[name.toLowerCase()] ?? match);
}

function cleanText(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();
}

function parseRobots(text) {
  const groups = [];
  let group;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) {
      group = undefined;
      continue;
    }

    const separator = line.indexOf(":");
    if (separator < 0) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!group || group.rules.length > 0) {
        group = { agents: [], rules: [], crawlDelayMs: 0 };
        groups.push(group);
      }
      group.agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && group) {
      group.rules.push({ allowed: field === "allow", path: value });
    } else if (field === "crawl-delay" && group) {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) group.crawlDelayMs = seconds * 1000;
    }
  }

  return groups;
}

function robotsRuleMatches(rulePath, requestPath) {
  if (rulePath === "") return false;
  const expression = rulePath
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  const suffix = rulePath.endsWith("$") ? "$" : "";
  const pattern = suffix ? expression.slice(0, -2) + "$" : expression;
  return new RegExp(`^${pattern}`).test(requestPath);
}

function isAllowedByRobots(robots, url) {
  const botName = USER_AGENT.toLowerCase();
  const matchingGroups = robots.filter((group) => group.agents.some((agent) => agent === "*" || botName.startsWith(agent)));

  // A robots file with no matching group places no restriction on this bot.
  if (matchingGroups.length === 0) return true;

  // A specific bot group takes precedence over the wildcard group.
  const mostSpecific = Math.max(...matchingGroups.map((group) => Math.max(...group.agents.map((agent) => (agent === "*" ? 0 : agent.length)))));
  const applicableGroups = matchingGroups.filter(
    (group) => Math.max(...group.agents.map((agent) => (agent === "*" ? 0 : agent.length))) === mostSpecific,
  );
  const requestPath = `${new URL(url).pathname}${new URL(url).search}`;
  const rules = applicableGroups.flatMap((group) => group.rules).filter((rule) => robotsRuleMatches(rule.path, requestPath));
  if (rules.length === 0) return true;

  rules.sort((left, right) => {
    const lengthDifference = right.path.length - left.path.length;
    return lengthDifference || Number(right.allowed) - Number(left.allowed);
  });
  return rules[0].allowed;
}

function crawlDelayForBot(robots) {
  const botName = USER_AGENT.toLowerCase();
  return Math.max(
    0,
    ...robots
      .filter((group) => group.agents.some((agent) => agent === "*" || botName.startsWith(agent)))
      .map((group) => group.crawlDelayMs ?? 0),
  );
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeEntities(match[1]));
}

function extractHomepageGuideUrls(html) {
  return [...html.matchAll(/<a\b([^>]*)>/gi)]
    .map((match) => {
      const attributes = match[1];
      const href = attributes.match(/\bhref=["']([^"']+)["']/i)?.[1];
      const classes = attributes.match(/\bclass=["']([^"']+)["']/i)?.[1] ?? "";
      return /(?:^|\s)guide-cover(?:\s|$)/.test(classes) && href ? new URL(href, SOURCE_ORIGIN).toString() : undefined;
    })
    .filter((url) => url !== undefined);
}

function englishGuideUrls(sitemap, homepage) {
  const homepageUrls = new Set(extractHomepageGuideUrls(homepage));
  return [...new Set(extractLocs(sitemap))]
    .map((url) => new URL(url, SOURCE_ORIGIN).toString())
    .filter((url) => homepageUrls.has(url))
    .sort();
}

function extractGuidePage(html, url) {
  const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (!articleMatch) throw new Error(`Could not find the article in ${url}`);

  const pageTitleMatch = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const title = cleanText(pageTitleMatch?.[1] ?? "");
  if (!title) throw new Error(`Could not find a page title in ${url}`);

  const hierarchy = new Map();
  const sections = [...articleMatch[1].matchAll(/<h([2-4])\b([^>]*)>([\s\S]*?)<\/h\1>/gi)]
    .map((match) => {
      const level = Number(match[1]);
      const idMatch = match[2].match(/\bid=["']([^"']+)["']/i);
      const heading = cleanText(match[3]);
      if (!idMatch || !heading) return undefined;

      hierarchy.set(level, heading);
      for (let deeperLevel = level + 1; deeperLevel <= 4; deeperLevel += 1) hierarchy.delete(deeperLevel);
      const parents = [...hierarchy.entries()]
        .filter(([parentLevel]) => parentLevel < level)
        .sort(([left], [right]) => left - right)
        .map(([, parentTitle]) => parentTitle);
      return { title: heading, url: `${url}#${idMatch[1]}`, level, parents };
    })
    .filter((section) => section !== undefined);

  if (sections.length === 0) throw new Error(`Could not find headings in ${url}`);
  return { title, url, sections };
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function readCuratedGuides() {
  const raw = await readFile(DATA_PATH, "utf8");
  const guides = JSON.parse(raw);
  if (!Array.isArray(guides) || guides.length === 0) throw new Error(`${DATA_PATH} must contain a non-empty array`);

  const titles = new Set();
  const content = new Set();
  for (const [index, guide] of guides.entries()) {
    if (!guide || typeof guide !== "object") throw new Error(`Guide ${index + 1} is not an object`);
    for (const field of ["title", "fact", "action", "source"]) {
      if (typeof guide[field] !== "string" || guide[field].trim() === "") {
        throw new Error(`Guide ${index + 1} is missing a non-empty ${field}`);
      }
    }

    const titleKey = normalize(guide.title);
    if (titles.has(titleKey)) throw new Error(`Duplicate guide title: ${guide.title}`);
    titles.add(titleKey);

    const contentKey = `${normalize(guide.fact)}|${normalize(guide.action)}`;
    if (content.has(contentKey)) throw new Error(`Duplicate guide content: ${guide.title}`);
    content.add(contentKey);

    const source = new URL(guide.source);
    if (source.origin !== SOURCE_ORIGIN || !source.hash || source.search) {
      throw new Error(`Guide ${index + 1} must link to an anchored English source URL: ${guide.source}`);
    }
  }

  return guides;
}

function validateGuides(guides, pages) {
  const pagesByUrl = new Map(pages.map((page) => [page.url, page]));
  const coverage = new Map();

  for (const guide of guides) {
    const source = new URL(guide.source);
    const pageUrl = `${source.origin}${source.pathname}`;
    const page = pagesByUrl.get(pageUrl);
    if (!page) throw new Error(`Guide source is not in the English sitemap: ${guide.source}`);

    const sectionUrl = `${pageUrl}${source.hash}`;
    if (!page.sections.some((section) => section.url === sectionUrl)) {
      throw new Error(`Guide source fragment does not match a heading: ${guide.source}`);
    }
    coverage.set(pageUrl, (coverage.get(pageUrl) ?? 0) + 1);
  }

  const uncovered = pages.filter((page) => !coverage.has(page.url));
  if (uncovered.length > 0) {
    throw new Error(`No curated entries cover: ${uncovered.map((page) => page.url).join(", ")}`);
  }
}

function indexFor(pages, guides) {
  return {
    source: SOURCE_ORIGIN + "/",
    license: {
      name: "CC-BY-4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
    },
    entryCount: guides.length,
    guides: pages,
  };
}

function taxonomyFor(pages) {
  return Object.fromEntries(
    pages.flatMap((page) =>
      page.sections.map((section) => [
        section.url,
        {
          guide: page.title,
          section: section.parents[0] ?? section.title,
          topic: section.parents.length > 0 ? section.title : undefined,
        },
      ]),
    ),
  );
}

async function main() {
  console.log(`Reading ${ROBOTS_URL}`);
  const robots = parseRobots(await fetchText(ROBOTS_URL));
  if (!isAllowedByRobots(robots, SITEMAP_URL)) throw new Error(`${SITEMAP_URL} is disallowed by robots.txt`);
  const requestDelayMs = Math.max(delayMs, crawlDelayForBot(robots));

  await sleep(requestDelayMs);
  console.log(`Reading ${SITEMAP_URL}`);
  const sitemap = await fetchText(SITEMAP_URL);
  if (!isAllowedByRobots(robots, HOME_URL)) throw new Error(`${HOME_URL} is disallowed by robots.txt`);

  await sleep(requestDelayMs);
  console.log(`Reading ${HOME_URL}`);
  const homepage = await fetchText(HOME_URL);
  const urls = englishGuideUrls(sitemap, homepage);
  if (urls.length === 0) throw new Error("No English guide pages found in the sitemap");

  const pages = [];
  for (const [index, url] of urls.entries()) {
    if (!isAllowedByRobots(robots, url)) throw new Error(`${url} is disallowed by robots.txt`);
    await sleep(requestDelayMs);
    console.log(`Reading ${url} (${index + 1}/${urls.length})`);
    pages.push(extractGuidePage(await fetchText(url), url));
  }

  const guides = await readCuratedGuides();
  validateGuides(guides, pages);
  const output = indexFor(pages, guides);

  if (shouldWrite) {
    await writeFile(INDEX_PATH, `${JSON.stringify(output, null, 2)}\n`);
    await writeFile(TAXONOMY_PATH, `${JSON.stringify(taxonomyFor(pages), null, 2)}\n`);
    console.log(`Wrote ${INDEX_PATH}`);
    console.log(`Wrote ${TAXONOMY_PATH}`);
  }

  console.log(`Validated ${guides.length} transformed entries across ${pages.length} source guides.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
