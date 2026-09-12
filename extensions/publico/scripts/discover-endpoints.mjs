#!/usr/bin/env node
// @ts-check
/**
 * Público API endpoint discovery — a dev-only "spider" for the /api/ namespace.
 *
 * Público's WAF challenges every HTML route (homepage, /pesquisa) with an empty
 * 202, so a classic HTML crawler is useless here. The value lives in the JSON
 * API under https://www.publico.pt/api, which is NOT challenged. This script
 * probes that namespace against a slug wordlist and records what actually works,
 * writing a manifest the extension consumes as its source of truth.
 *
 * Run locally (your network is unrestricted) — NOT bundled into the extension:
 *   npm run discover
 *
 * Output: docs/endpoints.json (machine) + docs/endpoints.md (human-readable).
 */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = "https://www.publico.pt/api";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 6;

// Candidate section slugs for /api/list/{slug}. Confirmed ones plus likely
// Público sections/brands to probe. Add more here when you spot new ones.
const SECTION_SLUGS = [
  // confirmed working
  "ultimas",
  "destaque",
  "politica",
  "mundo",
  "economia",
  "desporto",
  "cultura",
  "sociedade",
  "ciencia",
  "tecnologia",
  "opiniao",
  "local",
  "p3",
  "fugas",
  "ipsilon",
  "impar",
  // candidates to verify
  "media",
  "ambiente",
  "azul",
  "ecosfera",
  "educacao",
  "saude",
  "brasil",
  "parlamento",
  "gente",
  "tendencias",
  "viagens",
  "gastronomia",
  "casa",
  "automoveis",
  "infografia",
  "multimedia",
  "videos",
  "podcasts",
  "fotogaleria",
  "culto",
  "mais-lidas",
  "lisboa",
  "porto",
  "europa",
];

// Known non-list API endpoints worth documenting (probed, not enumerated).
// {id} is filled from a real article id discovered during the run.
const KNOWN_ENDPOINTS = [
  { path: "/content/news/{id}", note: "Full article detail by numeric id" },
];

/** Fetch JSON with a timeout; returns {ok, status, json|null, bytes, error}. */
async function probe(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json,text/html;q=0.8" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON (HTML error page or WAF challenge) */
    }
    return {
      ok: res.ok,
      status: res.status,
      json,
      bytes: text.length,
      ms: Date.now() - started,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      json: null,
      bytes: 0,
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Run async tasks with a bounded concurrency pool. */
async function pool(items, worker, limit = CONCURRENCY) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/** Pull a human-readable section label from the first article's rubrica. */
function sectionLabel(articles) {
  for (const a of articles) {
    const r = a?.rubrica ?? a?.rubricTag;
    if (typeof r === "string" && r.trim()) return r.trim();
    if (r && typeof r === "object" && typeof r.titulo === "string")
      return r.titulo.trim();
  }
  return null;
}

async function discoverSections() {
  console.log(`Probing ${SECTION_SLUGS.length} section slugs…`);
  const rows = await pool(SECTION_SLUGS, async (slug) => {
    const r = await probe(`${BASE}/list/${slug}`);
    const list = Array.isArray(r.json) ? r.json : [];
    const exclusive = list.filter((a) => a?.isExclusive).length;
    const row = {
      slug,
      endpoint: `/list/${slug}`,
      status: r.status,
      works: r.status === 200 && list.length > 0,
      items: list.length,
      label: sectionLabel(list),
      paywalledRatio: list.length ? +(exclusive / list.length).toFixed(2) : 0,
      sampleId: list[0]?.id ?? null,
      sampleTitle: list[0]?.titulo
        ? String(list[0].titulo)
            .replace(/<[^>]+>/g, "")
            .slice(0, 80)
        : null,
      ms: r.ms,
    };
    const mark = row.works ? "✓" : "✗";
    console.log(
      `  ${mark} ${slug.padEnd(14)} HTTP ${r.status} items=${row.items}` +
        (row.label ? `  (${row.label})` : ""),
    );
    return row;
  });
  return rows.sort(
    (a, b) => Number(b.works) - Number(a.works) || a.slug.localeCompare(b.slug),
  );
}

async function documentKnown(sampleId) {
  const out = [];
  for (const ep of KNOWN_ENDPOINTS) {
    if (ep.path.includes("{id}") && sampleId) {
      const r = await probe(`${BASE}${ep.path.replace("{id}", sampleId)}`);
      out.push({
        ...ep,
        verifiedWith: sampleId,
        status: r.status,
        works: r.status === 200 && r.json != null,
      });
    } else {
      out.push({ ...ep, status: null, works: null });
    }
  }
  return out;
}

async function main() {
  const sections = await discoverSections();
  const working = sections.filter((s) => s.works);
  const sampleId = working.find((s) => s.sampleId)?.sampleId ?? null;
  const knownEndpoints = await documentKnown(sampleId);

  const manifest = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    notes: [
      "HTML routes (homepage, /pesquisa) are WAF-challenged (HTTP 202, empty body).",
      "JSON /api/list/{slug} routes are open and return ~10 full article objects.",
      "List endpoints ignore count/page/limit params — always ~10 items.",
      "/api/list/pesquisa ignores its query param (returns the science feed).",
      "Section label comes from each article's `rubrica` field; `secao` is null.",
      "SEARCH: /api/list/{slug} also accepts TAG slugs, not just sections. " +
        "Slugify a query (lowercase, strip accents, spaces->hyphens) and it " +
        "returns topic-filtered articles (e.g. donald-trump, ebola, benfica). " +
        "Unknown slugs return 0 items — a clean no-results signal. This is the " +
        "viable replacement for the WAF-blocked /pesquisa HTML search.",
    ],
    workingSections: working.map(
      ({ slug, endpoint, label, items, paywalledRatio }) => ({
        slug,
        endpoint,
        label,
        items,
        paywalledRatio,
      }),
    ),
    allProbes: sections,
    knownEndpoints,
  };

  const here = dirname(fileURLToPath(import.meta.url));
  const docsDir = join(here, "..", "docs");
  await mkdir(docsDir, { recursive: true });
  await writeFile(
    join(docsDir, "endpoints.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(join(docsDir, "endpoints.md"), renderMarkdown(manifest));

  console.log(
    `\nDone. ${working.length}/${sections.length} section slugs work. ` +
      `Wrote docs/endpoints.json and docs/endpoints.md`,
  );
}

function renderMarkdown(m) {
  const lines = [
    "# Público API — Discovered Endpoints",
    "",
    `_Generated ${m.generatedAt} by \`scripts/discover-endpoints.mjs\`._`,
    "",
    `Base URL: \`${m.base}\``,
    "",
    "## Notes",
    "",
    ...m.notes.map((n) => `- ${n}`),
    "",
    "## Working section feeds",
    "",
    "| Slug | Label | Items | Paywalled |",
    "| --- | --- | --- | --- |",
    ...m.workingSections.map(
      (s) =>
        `| \`${s.slug}\` | ${s.label ?? "—"} | ${s.items} | ${Math.round(
          s.paywalledRatio * 100,
        )}% |`,
    ),
    "",
    "## All probes",
    "",
    "| Slug | HTTP | Works | Items |",
    "| --- | --- | --- | --- |",
    ...m.allProbes.map(
      (s) =>
        `| \`${s.slug}\` | ${s.status} | ${s.works ? "✓" : "✗"} | ${s.items} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
