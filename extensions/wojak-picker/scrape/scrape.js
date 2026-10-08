#!/usr/bin/env node

/**
 * Wojak Land Scraper
 * Scrapes https://wojakland.com, writes a manifest, and downloads image assets.
 * Run: node scrape/scrape.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://wojakland.com";
const MANIFEST_PATH = path.join(__dirname, "../assets/wojaks.json");
const IMAGE_DIR = path.join(__dirname, "../assets/wojaks");
const PAGE_DELAY_MS = 250;
const REQUEST_TIMEOUT_MS = 30000;
const DOWNLOAD_CONCURRENCY = 6;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function buildPageUrl(baseUrl, pageNumber) {
  if (pageNumber <= 1) {
    return ensureTrailingSlash(baseUrl);
  }

  return `${ensureTrailingSlash(baseUrl)}${pageNumber}/`;
}

function request(url, responseType = "text", redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WojakPickerBot/1.0)" },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const statusCode = res.statusCode || 0;

        if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location) {
          if (redirects >= 5) {
            res.resume();
            reject(new Error(`Too many redirects for ${url}`));
            return;
          }

          const redirectUrl = new URL(res.headers.location, url).toString();
          res.resume();
          resolve(request(redirectUrl, responseType, redirects + 1));
          return;
        }

        if (statusCode !== 200) {
          res.resume();
          reject(new Error(`Request failed for ${url}: HTTP ${statusCode}`));
          return;
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve(responseType === "buffer" ? buffer : buffer.toString("utf8"));
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Request timed out for ${url}`));
    });
    req.on("error", reject);
  });
}

function fetchPage(url) {
  return request(url, "text");
}

function fetchBinary(url) {
  return request(url, "buffer");
}

function sanitizeSegment(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function extractCategories(html) {
  const blockMatch = html.match(/<h1[^>]*>\s*Categories\s*<\/h1>([\s\S]*?)<\/main>/i);
  const scope = blockMatch ? blockMatch[1] : html;
  const linkRegex = /<a [^>]*href="(https:\/\/wojakland\.com\/([^"?#]+)\/?)"[^>]*>([\s\S]*?)<\/a>/gi;
  const skip = new Set(["categories", "privacy-policy", "buy-wojaks", "prayers", ""]);
  const categories = [];
  let match;

  while ((match = linkRegex.exec(scope)) !== null) {
    const slug = match[2].replace(/\/$/, "");
    const name = stripTags(match[3]);

    if (!slug || skip.has(slug) || !name || name === "Wojak Land") {
      continue;
    }

    categories.push({
      slug,
      name,
      url: ensureTrailingSlash(`${BASE_URL}/${slug}`),
    });
  }

  const seen = new Set();
  return categories.filter((category) => {
    if (seen.has(category.slug)) {
      return false;
    }

    seen.add(category.slug);
    return true;
  });
}

function extractLastPageNumber(html) {
  const pageMatches = [...html.matchAll(/class="post-page-numbers[^"]*"[^>]*>(\d+)<\/a>/gi)];
  const numbers = pageMatches
    .map((match) => Number.parseInt(match[1], 10))
    .filter((value) => Number.isFinite(value));

  return numbers.length > 0 ? Math.max(...numbers, 1) : 1;
}

function extractWojaks(html, category) {
  const items = [];
  const imageRegex =
    /<a [^>]*href="(https:\/\/wojakland\.com\/wp-content\/grand-media\/image\/([^"?#]+?\.(?:png|webp|jpg|jpeg)))"[^>]*class="[^"]*gmPhantom_Thumb[^"]*"[^>]*>\s*<img[^>]*src="(https:\/\/wojakland\.com\/wp-content\/grand-media\/image\/thumb\/[^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi;

  let match;
  while ((match = imageRegex.exec(html)) !== null) {
    const fullUrl = match[1];
    const filename = path.basename(match[2]);
    const thumbUrl = match[3];
    const name = decodeHtmlEntities(match[4]).trim();

    if (!name || !filename) {
      continue;
    }

    items.push({
      id: filename,
      name,
      slug: category.slug,
      category: category.name,
      filename,
      extension: path.extname(filename).replace(/^\./, "").toLowerCase(),
      sourcePageUrl: category.url,
      thumbUrl,
      fullUrl,
      localPath: `assets/wojaks/${sanitizeSegment(category.slug)}/${filename}`,
    });
  }

  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

async function scrapeCategory(category) {
  const pageOneHtml = await fetchPage(category.url);
  const totalPages = extractLastPageNumber(pageOneHtml);
  const pages = [{ url: category.url, html: pageOneHtml, pageNumber: 1 }];

  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    await sleep(PAGE_DELAY_MS);
    const pageUrl = buildPageUrl(category.url, pageNumber);
    const html = await fetchPage(pageUrl);
    pages.push({ url: pageUrl, html, pageNumber });
  }

  const items = [];
  for (const page of pages) {
    const pageItems = extractWojaks(page.html, category).map((item) => ({
      ...item,
      sourcePageUrl: page.url,
      pageNumber: page.pageNumber,
    }));
    items.push(...pageItems);
  }

  const seen = new Set();
  const deduped = items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });

  return { totalPages, items: deduped };
}

async function downloadImage(item) {
  const destination = path.join(__dirname, "..", item.localPath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });

  if (fs.existsSync(destination) && fs.statSync(destination).size > 0) {
    return { status: "skipped" };
  }

  const buffer = await fetchBinary(item.fullUrl);
  fs.writeFileSync(destination, buffer);
  return { status: "downloaded", bytes: buffer.length };
}

async function runWithConcurrency(items, limit, worker) {
  const results = [];
  let nextIndex = 0;

  async function consume() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => consume());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log("Fetching categories...");
  const categoriesHtml = await fetchPage(`${BASE_URL}/categories/`);
  const categories = extractCategories(categoriesHtml);
  console.log(`Found ${categories.length} categories`);

  const allWojaks = [];
  const failedCategories = [];

  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    process.stdout.write(`[${index + 1}/${categories.length}] ${category.name}... `);

    try {
      const { totalPages, items } = await scrapeCategory(category);
      allWojaks.push(...items);
      console.log(`${items.length} assets across ${totalPages} page(s)`);
      await sleep(PAGE_DELAY_MS);
    } catch (error) {
      console.log(`failed (${error.message})`);
      failedCategories.push(category);
    }
  }

  const seen = new Set();
  const manifest = allWojaks
    .filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written: ${manifest.length} unique assets`);

  let downloadedCount = 0;
  let skippedCount = 0;
  const failedDownloads = [];

  await runWithConcurrency(manifest, DOWNLOAD_CONCURRENCY, async (item, index) => {
    process.stdout.write(`Downloading [${index + 1}/${manifest.length}] ${item.filename}... `);

    try {
      const result = await downloadImage(item);
      if (result.status === "downloaded") {
        downloadedCount += 1;
        console.log("downloaded");
      } else {
        skippedCount += 1;
        console.log("skipped");
      }
    } catch (error) {
      failedDownloads.push({ item, error: error.message });
      console.log(`failed (${error.message})`);
    }
  });

  console.log("");
  console.log(`Finished. ${manifest.length} manifest entries.`);
  console.log(`Downloaded: ${downloadedCount}`);
  console.log(`Skipped existing: ${skippedCount}`);
  console.log(`Failed categories: ${failedCategories.length}`);
  console.log(`Failed downloads: ${failedDownloads.length}`);

  if (failedCategories.length > 0) {
    console.log(`Category failures: ${failedCategories.map((item) => item.name).join(", ")}`);
  }

  if (failedDownloads.length > 0) {
    console.log(
      `Download failures: ${failedDownloads
        .slice(0, 10)
        .map((entry) => `${entry.item.filename} (${entry.error})`)
        .join(", ")}`,
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
