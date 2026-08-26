#!/usr/bin/env node
/**
 * Builds assets/index.json from the CeyPay docs repo.
 *
 * Sources of truth, in order:
 *   1. docs.json navigation  -> tab + group each page belongs to
 *   2. *.mdx frontmatter     -> title, description, and the page URL (from file path)
 *   3. api/v1/openapi.json   -> every endpoint, with its canonical doc URL from `x-mint.href`
 *
 * MDX pages that declare `openapi:` in frontmatter are endpoint pages, not prose pages.
 * They are folded into the endpoint list so nothing is indexed twice.
 *
 * Usage:
 *   node scripts/build-index.mjs                # build + verify URLs against the live site
 *   node scripts/build-index.mjs --no-verify    # build only (offline)
 *   DOCS_DIR=/path/to/docs node scripts/build-index.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = process.env.DOCS_DIR ? path.resolve(process.env.DOCS_DIR) : path.resolve(ROOT, "..", "docs");
const OUT = path.join(ROOT, "assets", "index.json");
const VERIFY = !process.argv.includes("--no-verify");

/**
 * `assets/index.json` is committed, so the extension builds without the docs
 * repository. Only a contributor regenerating the index needs it — and only
 * they set DOCS_DIR, so an explicit path that does not exist is still an error.
 */
if (!fs.existsSync(path.join(DOCS_DIR, "docs.json"))) {
  if (process.env.DOCS_DIR) {
    console.error(`✗ No docs.json at ${DOCS_DIR}\n  Check the DOCS_DIR path.`);
    process.exit(1);
  }
  console.log(`• No docs checkout at ${DOCS_DIR} — keeping the committed assets/index.json.`);
  console.log("  Set DOCS_DIR to a CeyPay docs checkout to regenerate it.");
  process.exit(0);
}

const docsConfig = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, "docs.json"), "utf8"));
const BASE_URL = (docsConfig.seo?.metatags?.canonical ?? "https://docs.ceypay.io").replace(/\/$/, "");

/* ------------------------------------------------------------------ *
 * 1. Navigation map: page path -> { tab, group }
 * ------------------------------------------------------------------ */

const navByPage = new Map(); // "api/v1/quickstart" -> { tab, group }
const navByOperation = new Map(); // "GET /v1/payment/{id}" -> { tab, group }

const OPERATION_ENTRY = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\//i;

function walkNav(node, tab, group) {
  if (Array.isArray(node)) {
    for (const child of node) walkNav(child, tab, group);
    return;
  }
  if (typeof node === "string") {
    if (OPERATION_ENTRY.test(node)) {
      navByOperation.set(normaliseOperation(node), { tab, group });
    } else {
      navByPage.set(node.replace(/^\//, ""), { tab, group });
    }
    return;
  }
  if (node && typeof node === "object") {
    const nextTab = node.tab ?? tab;
    const nextGroup = node.group ?? group;
    for (const key of ["tabs", "groups", "pages", "anchors"]) {
      if (node[key]) walkNav(node[key], nextTab, key === "pages" ? nextGroup : nextGroup);
    }
  }
}

function normaliseOperation(entry) {
  const [method, ...rest] = entry.trim().split(/\s+/);
  return `${method.toUpperCase()} ${rest.join(" ")}`;
}

walkNav(docsConfig.navigation, "Docs", undefined);

/* ------------------------------------------------------------------ *
 * 2. MDX pages
 * ------------------------------------------------------------------ */

const IGNORED_DIRS = new Set(["node_modules", ".git", "snippets", "images", "logo", ".claude", ".lean-ctx"]);

function findMdx(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      findMdx(path.join(dir, entry.name), acc);
    } else if (entry.name.endsWith(".mdx")) {
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

/** Minimal YAML frontmatter reader — the docs only use flat scalar keys. */
function readFrontmatter(file) {
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const out = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[kv[1]] = value;
  }
  return out;
}

const pages = [];
const endpointTitleByOperation = new Map(); // "POST /v1/payment" -> "Create payment"

for (const file of findMdx(DOCS_DIR)) {
  const rel = path.relative(DOCS_DIR, file).replace(/\\/g, "/");
  const slug = rel.replace(/\.mdx$/, "");
  const fm = readFrontmatter(file);

  if (fm.openapi && OPERATION_ENTRY.test(fm.openapi)) {
    // An endpoint page — the spec owns its URL. Keep only the human-written title.
    endpointTitleByOperation.set(normaliseOperation(fm.openapi), fm.title ?? slug);
    continue;
  }

  const nav = navByPage.get(slug) ?? {};
  pages.push({
    title: fm.title ?? slug.split("/").pop(),
    description: fm.description ?? "",
    slug,
    url: `${BASE_URL}/${slug}`,
    tab: nav.tab ?? "Docs",
    group: nav.group ?? "",
  });
}

pages.sort((a, b) => a.slug.localeCompare(b.slug));

/* ------------------------------------------------------------------ *
 * 3. OpenAPI endpoints
 * ------------------------------------------------------------------ */

const SPEC_PATH = path.join(DOCS_DIR, "api", "v1", "openapi.json");
const spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

/** Resolves a local `$ref` one hop at a time; returns the node or undefined. */
function deref(node, seen = 0) {
  if (!node || typeof node !== "object" || seen > 10) return node;
  if (typeof node.$ref === "string" && node.$ref.startsWith("#/")) {
    const target = node.$ref
      .slice(2)
      .split("/")
      .reduce((acc, key) => acc?.[key.replace(/~1/g, "/").replace(/~0/g, "~")], spec);
    return deref(target, seen + 1);
  }
  return node;
}

function firstExample(content) {
  const json = content?.["application/json"];
  if (!json) return undefined;
  if (json.example !== undefined) return json.example;
  const named = json.examples && Object.values(json.examples)[0];
  return named?.value;
}

const endpoints = [];

for (const [urlPath, pathItem] of Object.entries(spec.paths)) {
  const sharedParams = pathItem.parameters ?? [];
  for (const method of METHODS) {
    const op = pathItem[method];
    if (!op) continue;

    const key = `${method.toUpperCase()} ${urlPath}`;
    const nav = navByOperation.get(key) ?? {};
    const href = op["x-mint"]?.href;

    const parameters = [...sharedParams, ...(op.parameters ?? [])].map((p) => {
      const param = deref(p);
      const schema = deref(param.schema) ?? {};
      return {
        name: param.name,
        in: param.in,
        required: Boolean(param.required),
        type: schema.type ?? (schema.enum ? "enum" : ""),
        description: param.description ?? "",
      };
    });

    const requestBody = deref(op.requestBody);
    const responses = Object.entries(op.responses ?? {}).map(([status, response]) => {
      const res = deref(response);
      return {
        status,
        description: res?.description ?? "",
        example: firstExample(res?.content),
      };
    });

    endpoints.push({
      method: method.toUpperCase(),
      path: urlPath,
      operationId: op.operationId ?? "",
      title: endpointTitleByOperation.get(key) ?? op.summary ?? key,
      summary: op.summary ?? "",
      description: op.description ?? "",
      tag: op.tags?.[0] ?? nav.group ?? "",
      group: nav.group ?? op.tags?.[0] ?? "",
      url: href ? `${BASE_URL}${href}` : `${BASE_URL}/api/v1/quickstart`,
      hasCanonicalUrl: Boolean(href),
      parameters,
      requestExample: firstExample(requestBody?.content),
      requestRequired: Boolean(requestBody?.required),
      responses,
    });
  }
}

endpoints.sort((a, b) => a.tag.localeCompare(b.tag) || a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

/* ------------------------------------------------------------------ *
 * 4. Write + verify
 * ------------------------------------------------------------------ */

const securityHeaders = Object.entries(spec.components?.securitySchemes ?? {})
  .filter(([, scheme]) => scheme.in === "header" && scheme.name)
  .map(([id, scheme]) => ({
    id,
    name: scheme.name,
    description: (scheme.description ?? "").split(/\r?\n/)[0],
  }));

/**
 * Verify before writing, so the index can record what is actually reachable.
 * The docs site is often behind this repo, and shipping links to pages that
 * 404 is worse than shipping without the link.
 */
const dead = new Set();

if (VERIFY) {
  const urls = [...new Set([...pages.map((p) => p.url), ...endpoints.filter((e) => e.hasCanonicalUrl).map((e) => e.url)])];
  console.log(`Verifying ${urls.length} URLs against ${BASE_URL} …`);

  const CONCURRENCY = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      try {
        const res = await fetch(url, { method: "HEAD", redirect: "follow" });
        if (!res.ok) dead.add(url);
      } catch {
        dead.add(url);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

// A page that is not live cannot be opened or read, so it is dropped entirely.
const livePages = pages.filter((page) => !dead.has(page.url));

// An endpoint stays useful without its docs page — everything the detail pane
// shows is bundled — so it keeps its entry and loses only the outbound link.
const markedEndpoints = endpoints.map((endpoint) =>
  dead.has(endpoint.url) ? { ...endpoint, hasCanonicalUrl: false, docsLive: false } : endpoint,
);

const index = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  servers: spec.servers ?? [],
  securityHeaders,
  tags: (spec.tags ?? []).map((t) => ({ name: t.name, description: t.description ?? "" })),
  pages: livePages,
  endpoints: markedEndpoints,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(index, null, 2) + "\n");

const sizeKb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`✓ ${livePages.length} pages, ${markedEndpoints.length} endpoints -> assets/index.json (${sizeKb} KB)`);

const missingHref = markedEndpoints.filter((e) => !e.hasCanonicalUrl && e.docsLive !== false);
if (missingHref.length) {
  console.warn(`⚠ ${missingHref.length} endpoints have no x-mint.href and fall back to the quickstart page:`);
  for (const e of missingHref) console.warn(`    ${e.method} ${e.path}`);
}

if (!VERIFY) process.exit(0);

if (dead.size === 0) {
  console.log("✓ every indexed URL is live");
  process.exit(0);
}

const droppedPages = pages.length - livePages.length;
const unlinkedEndpoints = markedEndpoints.filter((e) => e.docsLive === false).length;

console.warn(`\n⚠ ${dead.size} indexed URLs are not live yet — the deployed docs are behind this repo.`);
console.warn(`  ${droppedPages} page(s) omitted from the index.`);
console.warn(`  ${unlinkedEndpoints} endpoint(s) kept, with their docs link removed.`);
console.warn("  Deploy the docs and re-run to restore them.\n");
for (const url of [...dead].sort()) console.warn(`    ${url}`);
