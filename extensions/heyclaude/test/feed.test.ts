import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  CACHE_KEY,
  DETAIL_CACHE_PREFIX,
  absoluteDataUrl,
  buildContributeEntryUrl,
  buildEntrySummary,
  buildSuggestChangeUrl,
  buildSubmitIssueUrl,
  categoryLabel,
  detailCacheKey,
  entryKey,
  fallbackDetail,
  feedCacheKey,
  filterEntriesByCategory,
  isRaycastDetail,
  parseDetail,
  parseFavoriteKeys,
  parseFeed,
  resolveFeedUrl,
  serializeFavoriteKeys,
  sortedCategoryOptions,
  type RaycastEntry,
} from "../src/feed";
import {
  fetchFreshFeed,
  loadCachedFeed,
  loadEntryDetail,
  type RaycastTextCache,
} from "../src/runtime";
import {
  buildJobMarkdown,
  buildJobSummary,
  buildPostJobUrl,
  FAVORITE_JOBS_KEY,
  filterJobs,
  isValidRaycastJob,
  jobKey,
  jobsCacheKey,
  JOBS_CACHE_KEY,
  parseFavoriteJobKeys,
  parseJobsFeed,
  resolveJobsUrl,
  serializeFavoriteJobKeys,
  sortedJobFilterOptions,
  type RaycastJob,
} from "../src/jobs-feed";
import { fetchFreshJobs, loadCachedJobs } from "../src/jobs-runtime";
import { markdownLink, withRaycastUtm } from "../src/links";
import {
  buildSubmissionDraftText,
  isValidDomain,
  isValidHttpsUrl,
  normalizeDomain,
  normalizeSubmissionDraft,
  slugify,
} from "../src/submission";

const sampleEntry: RaycastEntry = {
  category: "mcp",
  slug: "context7",
  title: "Context7",
  description: "Fetch up-to-date docs.",
  tags: ["docs", "mcp"],
  brandName: "Upstash",
  brandDomain: "upstash.com",
  brandIconUrl:
    "https://cdn.brandfetch.io/domain/upstash.com/w/128/h/128/icon.png?c=test-client",
  brandAssetSource: "brandfetch",
  installCommand: "claude mcp add context7",
  configSnippet: "",
  copyText: "complete asset",
  copyTextLength: 14,
  copyTextTruncated: false,
  detailMarkdown: "# Context7",
  detailUrl: "/data/raycast/mcp/context7.json",
  webUrl: "https://heyclau.de/mcp/context7",
  repoUrl: "https://github.com/upstash/context7",
  documentationUrl: "https://context7.com",
  downloadTrust: "external",
  verificationStatus: "validated",
};

const sampleJob: RaycastJob = {
  slug: "ai-systems-engineer",
  title: "AI Systems Engineer",
  company: "Example Co",
  companyUrl: "https://example.com",
  location: "Remote",
  description: "Build Claude-native workflow systems.",
  type: "Full-time",
  postedAt: "2026-04-28",
  compensation: "$150K-$190K",
  equity: "Offered",
  benefits: ["Health benefits", "Remote work"],
  responsibilities: ["Ship integrations"],
  requirements: ["TypeScript"],
  featured: true,
  sponsored: false,
  applyUrl: "https://example.com/jobs/ai-systems-engineer",
  tier: "featured",
  source: "curated",
  sourceKind: "official_ats",
  sourceUrl: "https://example.com/jobs/ai-systems-engineer",
  sourceLabel: "Editorially curated",
  applySourceLabel: "External apply via ATS",
  lastVerifiedAt: "2026-04-28",
  isRemote: true,
  isWorldwide: true,
  webUrl: "https://heyclau.de/jobs/ai-systems-engineer",
  labels: ["Featured", "Editorially curated", "Remote", "Compensation listed"],
};

class MemoryCache implements RaycastTextCache {
  values = new Map<string, string>();
  get(key: string) {
    return this.values.get(key);
  }
  set(key: string, value: string) {
    this.values.set(key, value);
  }
  remove(key: string) {
    this.values.delete(key);
  }
}

function response(body: unknown, init: ResponseInit = {}) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function readSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return readSourceFiles(entryPath);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return fs.readFileSync(entryPath, "utf8");
  });
}

describe("Raycast feed helpers", () => {
  it("parses valid envelope entries and drops malformed rows", () => {
    const richSkillEntry = {
      ...sampleEntry,
      category: "skills",
      slug: "rich-skill",
      platformCompatibility: [
        {
          platform: "Claude",
          supportLevel: "native-skill",
          installPath: ".claude/skills/<skill-name>/SKILL.md",
        },
        {
          platform: "Cursor",
          supportLevel: "adapter",
          adapterPath: "/data/skill-adapters/cursor/rich-skill.mdc",
        },
        { platform: "Generic AGENTS" },
        { supportLevel: "missing-platform" },
      ],
      tags: ["skills", "skills", { invalid: true }],
    };
    const parsed = parseFeed(
      JSON.stringify({
        generatedAt: "2026-04-27T00:00:00.000Z",
        entries: [sampleEntry, richSkillEntry, { category: "mcp" }],
      }),
    );

    assert.equal(parsed.generatedAt, "2026-04-27T00:00:00.000Z");
    assert.equal(parsed.entries[0].slug, sampleEntry.slug);
    assert.deepEqual(parsed.entries[0].tags, sampleEntry.tags);
    assert.equal(parsed.entries[0].brandDomain, sampleEntry.brandDomain);
    assert.deepEqual(parsed.entries[1].platformCompatibility, [
      "Claude: native-skill",
      "Cursor: adapter",
      "Generic AGENTS",
    ]);
    assert.deepEqual(parsed.entries[1].tags, ["skills"]);
    assert.equal(parsed.entries.length, 2);
  });

  it("keeps the generated Raycast feed safe for native UI string props", () => {
    const feedPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      "apps",
      "web",
      "public",
      "data",
      "raycast-index.json",
    );
    const rawFeed = JSON.parse(fs.readFileSync(feedPath, "utf8")) as {
      entries?: unknown[];
    };
    const parsed = parseFeed(fs.readFileSync(feedPath, "utf8"));

    assert.equal(parsed.entries.length, rawFeed.entries?.length);
    assert.ok(parsed.entries.length > 0);
    for (const entry of parsed.entries) {
      assert.equal(
        entry.tags.every((tag) => typeof tag === "string"),
        true,
      );
      assert.equal(
        (entry.platformCompatibility || []).every(
          (platform) => typeof platform === "string",
        ),
        true,
      );
    }
  });

  it("rejects retired array feed payloads", () => {
    const parsed = parseFeed(JSON.stringify([sampleEntry]));

    assert.equal(parsed.generatedAt, "");
    assert.deepEqual(parsed.entries, []);
  });

  it("treats malformed envelopes as empty feeds", () => {
    assert.deepEqual(parseFeed(JSON.stringify({ entries: null })), {
      entries: [],
      generatedAt: "",
    });
  });

  it("normalizes detail URLs relative to the public feed", () => {
    assert.equal(
      absoluteDataUrl("/data/raycast/mcp/context7.json"),
      "https://heyclau.de/data/raycast/mcp/context7.json",
    );
    assert.equal(
      absoluteDataUrl(
        "/api/brand-assets/icon/discord.com",
        "https://preview.example.com/data/raycast-index.json",
      ),
      "https://preview.example.com/api/brand-assets/icon/discord.com",
    );
  });

  it("validates feed overrides and scopes cache keys by feed URL", () => {
    const devFeed = resolveFeedUrl(
      " https://preview.example.com/data/raycast-index.json#ignored ",
    );

    assert.equal(
      devFeed,
      "https://preview.example.com/data/raycast-index.json",
    );
    assert.equal(
      resolveFeedUrl(""),
      "https://heyclau.de/data/raycast-index.json",
    );
    assert.throws(
      () =>
        resolveFeedUrl("http://preview.example.com/data/raycast-index.json"),
      /HTTPS/,
    );
    assert.throws(
      () =>
        resolveFeedUrl("https://preview.example.com/data/search-index.json"),
      /\/data\/raycast-index\.json/,
    );

    assert.equal(feedCacheKey(), CACHE_KEY);
    assert.notEqual(feedCacheKey(devFeed), CACHE_KEY);
    assert.match(feedCacheKey(devFeed), /^heyclaude-raycast-index:/);
    assert.equal(
      detailCacheKey(sampleEntry),
      `${DETAIL_CACHE_PREFIX}:${entryKey(sampleEntry)}`,
    );
    assert.notEqual(
      detailCacheKey(sampleEntry, devFeed),
      `${DETAIL_CACHE_PREFIX}:${entryKey(sampleEntry)}`,
    );
  });

  it("resolves jobs feeds from the production HeyClaude host", () => {
    const jobsUrl = resolveJobsUrl();

    assert.equal(jobsUrl, "https://heyclau.de/api/jobs?limit=100");
    assert.equal(jobsCacheKey(), JOBS_CACHE_KEY);
    assert.equal(jobsCacheKey(jobsUrl), JOBS_CACHE_KEY);
    assert.equal(buildPostJobUrl(jobsUrl), "https://heyclau.de/jobs/post");
  });

  it("builds issue-first contribution URLs without local write targets", () => {
    const contributeUrl = new URL(buildContributeEntryUrl(sampleEntry));
    assert.equal(contributeUrl.origin, "https://heyclau.de");
    assert.equal(contributeUrl.pathname, "/submit");
    assert.equal(contributeUrl.searchParams.get("category"), "mcp");
    assert.equal(contributeUrl.searchParams.get("slug"), "context7");
    assert.equal(contributeUrl.searchParams.get("brand_name"), "Upstash");
    assert.equal(contributeUrl.searchParams.get("brand_domain"), "upstash.com");
    assert.equal(contributeUrl.searchParams.get("tags"), "docs, mcp");

    const suggestUrl = new URL(buildSuggestChangeUrl(sampleEntry));
    assert.equal(suggestUrl.origin, "https://github.com");
    assert.equal(
      suggestUrl.pathname,
      "/JSONbored/claudepro-directory/issues/new",
    );
    assert.equal(suggestUrl.searchParams.get("template"), "submit-mcp.yml");
    assert.equal(suggestUrl.searchParams.get("category"), "mcp");
    assert.equal(suggestUrl.searchParams.get("slug"), "context7");
    assert.equal(suggestUrl.searchParams.get("brand_name"), "Upstash");
    assert.equal(suggestUrl.searchParams.get("brand_domain"), "upstash.com");
    assert.match(suggestUrl.toString(), /^https:\/\//);
    assert.equal(suggestUrl.toString().includes("file:"), false);

    const newSkillUrl = new URL(buildSubmitIssueUrl("skills"));
    assert.equal(newSkillUrl.origin, "https://github.com");
    assert.equal(newSkillUrl.searchParams.get("template"), "submit-skill.yml");
    assert.equal(newSkillUrl.searchParams.get("category"), "skills");

    const draftUrl = new URL(
      buildSubmitIssueUrl({
        category: "mcp",
        title: "Asana MCP Server",
        slug: "asana-mcp-server",
        sourceUrl:
          "https://developers.asana.com/docs/using-asanas-model-control-protocol-mcp-server",
        brandName: "Asana",
        brandDomain: "asana.com",
        description: "Use Asana project tasks from Claude.",
        tags: ["asana", "project-management"],
      }),
    );
    assert.equal(draftUrl.searchParams.get("template"), "submit-mcp.yml");
    assert.equal(draftUrl.searchParams.get("name"), "Asana MCP Server");
    assert.equal(draftUrl.searchParams.get("brand_domain"), "asana.com");
    assert.equal(
      draftUrl.searchParams.get("docs_url")?.includes("asana.com"),
      true,
    );
  });

  it("normalizes Raycast submission drafts and growth links", () => {
    const draft = normalizeSubmissionDraft({
      category: "mcp",
      title: "Asana MCP Server",
      sourceUrl: "https://developers.asana.com/docs/mcp",
      brandName: "Asana",
      brandDomain: "https://www.asana.com/docs",
      description: "Use Asana projects and tasks from Claude.",
      tags: ["asana", "mcp", "asana"],
    });

    assert.equal(slugify("Asana MCP Server!"), "asana-mcp-server");
    assert.equal(normalizeDomain("https://www.asana.com/docs"), "asana.com");
    assert.equal(isValidDomain("asana.com"), true);
    assert.equal(isValidDomain("www.asana.com"), true);
    assert.equal(isValidDomain("not a domain"), false);
    assert.equal(isValidHttpsUrl("https://example.com"), true);
    assert.equal(isValidHttpsUrl("http://example.com"), false);
    assert.equal(draft.slug, "asana-mcp-server");
    assert.deepEqual(draft.tags, ["asana", "mcp"]);
    assert.match(buildSubmissionDraftText(draft), /Brand domain: asana.com/);

    assert.equal(
      withRaycastUtm("https://heyclau.de/submit", "submit-content"),
      "https://heyclau.de/submit?utm_source=raycast&utm_medium=extension&utm_content=submit-content",
    );
    assert.equal(
      withRaycastUtm("https://github.com/JSONbored/claudepro-directory"),
      "https://github.com/JSONbored/claudepro-directory",
    );
    assert.equal(
      markdownLink("Context7", "https://heyclau.de/mcp/context7"),
      "[Context7](https://heyclau.de/mcp/context7)",
    );
    assert.match(buildEntrySummary(sampleEntry), /Fetch up-to-date docs/);
  });

  it("validates and parses full detail payloads", () => {
    const detail = { copyText: "full text", detailMarkdown: "# Detail" };
    assert.equal(isRaycastDetail(detail), true);
    assert.deepEqual(parseDetail(JSON.stringify(detail)), detail);
    assert.equal(parseDetail(JSON.stringify({ copyText: "missing md" })), null);
    assert.deepEqual(fallbackDetail(sampleEntry), {
      copyText: sampleEntry.copyText,
      detailMarkdown: sampleEntry.detailMarkdown,
    });
  });

  it("parses, filters, and summarizes Raycast jobs", () => {
    const parsed = parseJobsFeed(
      JSON.stringify({
        generatedAt: "2026-04-28T00:00:00.000Z",
        count: 2,
        entries: [
          {
            ...sampleJob,
            labels: ["Featured", "Featured", { invalid: true }],
            benefits: ["Health benefits", "Health benefits", null],
          },
          { slug: "broken" },
        ],
      }),
    );

    assert.equal(isValidRaycastJob(sampleJob), true);
    assert.equal(parsed.generatedAt, "2026-04-28T00:00:00.000Z");
    assert.deepEqual(parsed.entries[0].labels, ["Featured"]);
    assert.deepEqual(parsed.entries[0].benefits, ["Health benefits"]);
    assert.equal(parsed.entries.length, 1);
    assert.equal(jobKey(sampleJob), "ai-systems-engineer");
    assert.deepEqual(
      sortedJobFilterOptions().map((item) => item.value),
      [
        "all",
        "favorites",
        "featured",
        "sponsored",
        "remote",
        "compensation",
        "curated",
        "claimed",
      ],
    );
    assert.deepEqual(filterJobs([sampleJob], "featured", new Set()), [
      sampleJob,
    ]);
    assert.deepEqual(filterJobs([sampleJob], "compensation", new Set()), [
      sampleJob,
    ]);
    assert.deepEqual(
      filterJobs([sampleJob], "favorites", new Set([sampleJob.slug])),
      [sampleJob],
    );
    const jobMarkdown = buildJobMarkdown(sampleJob);
    assert.match(jobMarkdown, /## Responsibilities/);
    assert.doesNotMatch(jobMarkdown, /\*\*Company:\*\*/);
    assert.doesNotMatch(jobMarkdown, /\*\*Location:\*\*/);
    assert.doesNotMatch(jobMarkdown, /\*\*Type:\*\*/);
    assert.doesNotMatch(jobMarkdown, /Apply on employer site/);
    assert.match(buildJobSummary(sampleJob), /Compensation: \$150K-\$190K/);
  });

  it("serializes favorites deterministically", () => {
    assert.deepEqual(parseFavoriteKeys(JSON.stringify(["b", "a", "a"])), [
      "a",
      "b",
    ]);
    assert.equal(serializeFavoriteKeys(new Set(["b", "a"])), '["a","b"]');
    assert.deepEqual(parseFavoriteJobKeys(JSON.stringify(["b", "a", "a"])), [
      "a",
      "b",
    ]);
    assert.equal(serializeFavoriteJobKeys(new Set(["b", "a"])), '["a","b"]');
  });

  it("builds category filters and favorites without mutating ranking", () => {
    const toolEntry = { ...sampleEntry, category: "tools", slug: "raycast" };
    const entries = [sampleEntry, toolEntry];
    const favorites = new Set([entryKey(toolEntry)]);

    assert.equal(categoryLabel("mcp"), "MCP Servers");
    assert.deepEqual(sortedCategoryOptions(entries), [
      { value: "all", title: "All Categories" },
      { value: "favorites", title: "Favorites" },
      { value: "mcp", title: "MCP Servers" },
      { value: "tools", title: "Tools" },
    ]);
    assert.deepEqual(filterEntriesByCategory(entries, "favorites", favorites), [
      toolEntry,
    ]);
    assert.deepEqual(filterEntriesByCategory(entries, "mcp", favorites), [
      sampleEntry,
    ]);
  });

  it("keeps the v1 extension read-only and non-mutating", () => {
    const source = readSourceFiles(path.join(process.cwd(), "src")).join("\n");
    const forbiddenPatterns = [
      /\bfrom\s+["'](?:node:)?fs(?:\/promises)?["']/,
      /\brequire\(["'](?:node:)?fs(?:\/promises)?["']\)/,
      /\bfrom\s+["'](?:node:)?child_process["']/,
      /\brequire\(["'](?:node:)?child_process["']\)/,
      /\bwriteFile(?:Sync)?\b/,
      /\bappendFile(?:Sync)?\b/,
      /\bmkdir(?:Sync)?\b/,
      /\bcreateWriteStream\b/,
      /\bOAuth\b/,
      /\bgetOAuthToken\b/,
      /\bwithAccessToken\b/,
      /\.cursor\//,
      /\.claude\//,
      /\.windsurf\//,
      /\bAGENTS\.md\b/,
      /\bGEMINI\.md\b/,
      /\b[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|API_KEY)\b/,
    ];

    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(source, pattern);
    }
  });

  it("keeps Raycast list rows compact enough for split-pane scanning", () => {
    const registrySource = fs.readFileSync(
      path.join(process.cwd(), "src", "registry-command.tsx"),
      "utf8",
    );
    const jobsSource = fs.readFileSync(
      path.join(process.cwd(), "src", "jobs.tsx"),
      "utf8",
    );

    assert.doesNotMatch(registrySource, /\n\s+subtitle=\{entry\.description\}/);
    assert.match(
      registrySource,
      /\n\s+subtitle=\{categoryLabel\(entry\.category\)\}/,
    );
    assert.doesNotMatch(registrySource, /\{ text: categoryLabel/);
    assert.doesNotMatch(
      registrySource,
      /\{ text: entry\.verificationStatus \}/,
    );
    assert.doesNotMatch(registrySource, /\{ text: "Full on demand" \}/);
    assert.match(registrySource, /metadata=\{entryDetailMetadata/);
    assert.match(registrySource, /Action\.CreateQuicklink/);
    assert.match(registrySource, /Action\.CreateSnippet/);

    assert.doesNotMatch(jobsSource, /\n\s+title=\{job\.company\}/);
    assert.match(jobsSource, /\n\s+title=\{job\.title\}/);
    assert.match(jobsSource, /\n\s+subtitle=\{job\.company\}/);
    assert.doesNotMatch(jobsSource, /\{ text: job\.location \}/);
    assert.match(jobsSource, /metadata=\{jobDetailMetadata/);
    assert.match(jobsSource, /Action\.CreateQuicklink/);
  });

  it("keeps the production Raycast manifest fixed to HeyClaude endpoints", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as { preferences?: unknown; commands?: { name?: string }[] };

    assert.equal(manifest.preferences, undefined);
    assert.deepEqual(
      (manifest.commands || []).map((command) => command.name),
      [
        "search",
        "search-agents",
        "search-mcp",
        "search-tools",
        "search-skills",
        "search-rules",
        "search-commands",
        "search-hooks",
        "search-guides",
        "search-collections",
        "search-statuslines",
        "jobs",
        "submit-content",
        "get-involved",
      ],
    );
  });

  it("loads and refreshes cached jobs without polluting registry cache", async () => {
    const cache = new MemoryCache();
    const jobsUrl = resolveJobsUrl();

    cache.set(
      jobsCacheKey(jobsUrl),
      JSON.stringify({
        generatedAt: "2026-04-28T00:00:00.000Z",
        entries: [sampleJob],
      }),
    );
    assert.equal(loadCachedJobs(cache, jobsUrl).entries.length, 1);

    let requestedUrl = "";
    const feed = await fetchFreshJobs({
      cache,
      fetchFn: async (input) => {
        requestedUrl = String(input);
        return response({
          generatedAt: "2026-04-28T00:00:00.000Z",
          count: 1,
          entries: [sampleJob],
        });
      },
    });

    assert.equal(requestedUrl, jobsUrl);
    assert.equal(feed.entries.length, 1);
    assert.match(cache.get(jobsCacheKey(jobsUrl)) || "", /ai-systems-engineer/);
    assert.equal(cache.get(CACHE_KEY), undefined);

    await assert.rejects(
      fetchFreshJobs({
        cache,
        fetchFn: async () => response({ entries: [] }),
      }),
      /Jobs feed contained no entries/,
    );
  });

  it("loads and clears cached feed snapshots deterministically", () => {
    const cache = new MemoryCache();
    cache.set(
      CACHE_KEY,
      JSON.stringify({
        generatedAt: "2026-04-28T00:00:00.000Z",
        entries: [sampleEntry],
      }),
    );
    assert.equal(loadCachedFeed(cache).entries.length, 1);

    cache.set(CACHE_KEY, "{bad json");
    assert.deepEqual(loadCachedFeed(cache), { entries: [], generatedAt: "" });
    assert.equal(cache.get(CACHE_KEY), undefined);
  });

  it("fetches fresh feed payloads and preserves compact feed contracts", async () => {
    const cache = new MemoryCache();
    let requestedUrl = "";
    const devFeed = "https://preview.example.com/data/raycast-index.json";
    const feed = await fetchFreshFeed({
      cache,
      feedUrl: devFeed,
      fetchFn: async (input) => {
        requestedUrl = String(input);
        return response({
          generatedAt: "2026-04-28T00:00:00.000Z",
          entries: [sampleEntry],
        });
      },
    });

    assert.equal(requestedUrl, devFeed);
    assert.equal(feed.entries.length, 1);
    assert.match(cache.get(feedCacheKey(devFeed)) || "", /context7/);
    assert.equal(cache.get(CACHE_KEY), undefined);
    assert.equal(loadCachedFeed(cache, devFeed).entries.length, 1);

    const productionFeed = await fetchFreshFeed({
      cache,
      fetchFn: async () =>
        response({
          generatedAt: "2026-04-28T00:00:00.000Z",
          entries: [sampleEntry],
        }),
    });

    assert.equal(productionFeed.entries.length, 1);
    assert.match(cache.get(CACHE_KEY) || "", /context7/);

    await assert.rejects(
      fetchFreshFeed({
        cache,
        fetchFn: async () => response({ entries: [] }),
      }),
      /Feed contained no entries/,
    );
  });

  it("loads detail payloads on demand and falls back only when no detail URL exists", async () => {
    const cache = new MemoryCache();
    let requestedUrl = "";
    const devFeed = "https://preview.example.com/data/raycast-index.json";
    const detail = await loadEntryDetail({
      entry: sampleEntry,
      cache,
      feedUrl: devFeed,
      fetchFn: async (input) => {
        requestedUrl = String(input);
        return response({
          copyText: "remote full text",
          detailMarkdown: "# Remote",
        });
      },
    });
    assert.deepEqual(detail, {
      copyText: "remote full text",
      detailMarkdown: "# Remote",
    });
    assert.equal(
      requestedUrl,
      "https://preview.example.com/data/raycast/mcp/context7.json",
    );
    assert.match(
      cache.get(detailCacheKey(sampleEntry, devFeed)) || "",
      /remote full text/,
    );
    assert.equal(
      cache.get(`${DETAIL_CACHE_PREFIX}:${entryKey(sampleEntry)}`),
      undefined,
    );

    await assert.rejects(
      loadEntryDetail({
        entry: { ...sampleEntry, slug: "broken" },
        cache: new MemoryCache(),
        fetchFn: async () => response({ copyText: "missing markdown" }),
      }),
      /Detail payload was malformed/,
    );

    assert.deepEqual(
      await loadEntryDetail({
        entry: { ...sampleEntry, detailUrl: "" },
        cache: new MemoryCache(),
      }),
      fallbackDetail(sampleEntry),
    );
  });
});
