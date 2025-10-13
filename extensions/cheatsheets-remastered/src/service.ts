import axios from "axios";
import { LocalStorage, showToast, Toast, getPreferenceValues, environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import { DEFAULT_SHEET_METADATA, DefaultMetadata } from "./default-tags";

interface ExtendedPreferences extends Preferences {
  githubToken?: string;
}

const BRANCH = "master";
const OWNER = "rstacruz";
const REPO = "cheatsheets";

interface Preferences {
  enableOfflineStorage: boolean;
  updateFrequency: "every-use" | "weekly" | "monthly" | "never";
  autoUpdate: boolean;
}

interface OfflineCheatsheet {
  slug: string;
  content: string;
  size: number;
}

interface FavoriteCheatsheet {
  id: string;
  type: "custom" | "default" | "repository";
  slug: string;
  title: string;
  favoritedAt: number;
}

interface ViewRecord {
  key: string; // `${type}:${slug}`
  type: "custom" | "default" | "repository";
  slug: string;
  title: string;
  count: number;
  lastViewedAt: number;
}

interface HiddenCheatsheet {
  key: string; // `${type}:${slug}`
  type: "custom" | "default" | "repository";
  slug: string;
  title: string;
  hiddenAt: number;
}

interface UserRepository {
  id: string;
  name: string;
  owner: string;
  description?: string;
  url: string;
  addedAt: number;
  lastAccessedAt?: number;
  isPrivate: boolean;
  defaultBranch: string;
  subdirectory?: string; // Optional subdirectory filter
  lastSyncedAt?: number; // Track when repository was last synced
}

interface RepositoryCheatsheet {
  id: string;
  repositoryId: string; // Reference to UserRepository
  slug: string; // Original file path without .md
  title: string; // Derived from filename or first heading
  content: string;
  filePath: string; // Original path in repository
  syncedAt: number;
  lastAccessedAt?: number;
}

// Configure axios with better defaults and retry logic
const listClient = axios.create({
  baseURL: `https://api.github.com/repos/${OWNER}/${REPO}/git/trees`,
  timeout: 10000,
  headers: {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Cheatsheets-Remastered-Raycast",
  },
});

const searchClient = axios.create({
  baseURL: `https://api.github.com/search/code`,
  timeout: 10000,
  headers: {
    Accept: "application/vnd.github.text-match+json",
    "User-Agent": "Cheatsheets-Remastered-Raycast",
  },
});

const fileClient = axios.create({
  baseURL: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`,
  timeout: 15000,
  headers: {
    Accept: "text/plain",
    "User-Agent": "Cheatsheets-Remastered-Raycast",
  },
});

interface ListResponse {
  sha: string;
  url: string;
  tree: File[];
}

interface File {
  path: string;
  mode: string;
  type: "tree" | "blob";
  sha: string;
  size: number;
  url: string;
}

interface CustomCheatsheet {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  description?: string;
}

// Type guards for untyped JSON
function isCustomCheatsheet(value: unknown): value is CustomCheatsheet {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.content === "string" &&
    typeof v.createdAt === "number" &&
    typeof v.updatedAt === "number"
  );
}

interface ImportedCheatsheetInput {
  title: string;
  content: string;
  tags?: string[];
  description?: string;
  createdAt?: number;
  updatedAt?: number;
}

function isImportedCheatsheetInput(value: unknown): value is ImportedCheatsheetInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.title === "string" && typeof v.content === "string";
}

const mockSheets = {
  javascript: `# JavaScript Cheatsheet

## Variables
\`\`\`javascript
let name = 'John';
const age = 30;
var oldWay = 'deprecated';
\`\`\`

## Functions
\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

const arrowFunc = (name) => \`Hello, \${name}!\`;
\`\`\`

## Modern Features
\`\`\`javascript
// Destructuring
const { name, age } = person;

// Spread operator
const newArray = [...oldArray, newItem];

// Optional chaining
const value = obj?.prop?.subProp;
\`\`\``,
  python: `# Python Cheatsheet

## Variables
\`\`\`python
name = "John"
age = 30
is_student = True
\`\`\`

## Functions
\`\`\`python
def greet(name):
    return f"Hello, {name}!"

lambda_func = lambda name: f"Hello, {name}!"
\`\`\`

## Data Structures
\`\`\`python
# List comprehension
squares = [x**2 for x in range(10)]

# Dictionary comprehension
word_counts = {word: text.count(word) for word in set(text.split())}
\`\`\``,
  git: `# Git Cheatsheet

## Basic Commands
\`\`\`bash
git init
git add .
git commit -m "message"
git push origin main
\`\`\`

## Branching
\`\`\`bash
git branch feature-name
git checkout feature-name
git merge feature-name
\`\`\`

## Advanced
\`\`\`bash
# Stash changes
git stash
git stash pop

# Reset to previous commit
git reset --hard HEAD~1
\`\`\``,
  docker: `# Docker Cheatsheet

## Basic Commands
\`\`\`bash
docker build -t image-name .
docker run -d -p 8080:80 image-name
docker ps
docker stop container-id
\`\`\`

## Docker Compose
\`\`\`yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "8000:8000"
\`\`\``,
};

class Service {
  // Simple in-memory guards for noisy rate limit errors
  private static RATE_LIMIT_UNTIL_MS = 0;
  private static LAST_RATE_TOAST_AT_MS = 0;
  private static RATE_TOAST_COOLDOWN_MS = 60 * 1000; // 1 minute
  private static DEVHINTS_SITEMAP_CACHE: string[] | null = null;
  private static DEVHINTS_SITEMAP_CACHE_AT_MS = 0;
  private static LOCAL_SHEETS_DIR = path.join(environment.assetsPath, "cheatsheets");

  // Preferences management using Raycast's built-in system
  static getPreferences(): Preferences {
    try {
      const prefs = getPreferenceValues<Preferences>();
      return {
        enableOfflineStorage: prefs.enableOfflineStorage || false,
        updateFrequency: prefs.updateFrequency || "never",
        autoUpdate: prefs.autoUpdate || false,
      };
    } catch (error) {
      console.warn("Failed to load preferences:", error);
      // Default preferences
      return {
        enableOfflineStorage: false,
        updateFrequency: "never",
        autoUpdate: false,
      };
    }
  }

  // Auto-update helpers for offline cache
  private static frequencyToMs(freq: Preferences["updateFrequency"]): number {
    switch (freq) {
      case "every-use":
        return 0;
      case "weekly":
        return 7 * 24 * 60 * 60 * 1000;
      case "monthly":
        return 30 * 24 * 60 * 60 * 1000;
      case "never":
      default:
        return Number.POSITIVE_INFINITY;
    }
  }

  static async getLastOfflineUpdate(): Promise<number> {
    const ts = await LocalStorage.getItem<number>("last-offline-update");
    return typeof ts === "number" ? ts : 0;
  }

  static async setLastOfflineUpdate(timestamp: number): Promise<void> {
    await LocalStorage.setItem("last-offline-update", timestamp);
  }

  static async shouldUpdateOffline(): Promise<boolean> {
    const prefs = this.getPreferences();
    if (!prefs.enableOfflineStorage || !prefs.autoUpdate) return false;
    const interval = this.frequencyToMs(prefs.updateFrequency);
    if (!isFinite(interval)) return false;
    const last = await this.getLastOfflineUpdate();
    const now = Date.now();
    return now - last >= interval;
  }

  static async updateOfflineIfNeeded(): Promise<void> {
    try {
      if (await this.shouldUpdateOffline()) {
        showToast({
          style: Toast.Style.Animated,
          title: "Updating Offline Cache",
        });
        const { success } = await this.downloadAllForOffline();
        await this.setLastOfflineUpdate(Date.now());
        showToast({
          style: Toast.Style.Success,
          title: `Offline Updated (${success})`,
        });
      }
    } catch (e) {
      console.warn("Auto-update offline failed:", e);
    }
  }

  // Offline storage management
  static async getOfflineCheatsheets(): Promise<OfflineCheatsheet[]> {
    try {
      const offlineData = await LocalStorage.getItem<string>("offline-cheatsheets");
      return offlineData ? JSON.parse(offlineData) : [];
    } catch (error) {
      console.warn("Failed to load offline cheatsheets:", error);
      return [];
    }
  }

  static async saveOfflineCheatsheet(slug: string, content: string): Promise<void> {
    try {
      const offlineSheets = await this.getOfflineCheatsheets();
      const existingIndex = offlineSheets.findIndex((sheet) => sheet.slug === slug);

      const offlineSheet: OfflineCheatsheet = {
        slug,
        content,
        size: content.length,
      };

      if (existingIndex >= 0) {
        offlineSheets[existingIndex] = offlineSheet;
      } else {
        offlineSheets.push(offlineSheet);
      }

      await LocalStorage.setItem("offline-cheatsheets", JSON.stringify(offlineSheets));
    } catch (error) {
      console.error("Failed to save offline cheatsheet:", error);
      throw error;
    }
  }

  static async getOfflineCheatsheet(slug: string): Promise<OfflineCheatsheet | null> {
    try {
      const offlineSheets = await this.getOfflineCheatsheets();
      return offlineSheets.find((sheet) => sheet.slug === slug) || null;
    } catch (error) {
      console.error("Failed to get offline cheatsheet:", error);
      return null;
    }
  }

  static async clearOfflineStorage(): Promise<void> {
    try {
      await LocalStorage.removeItem("offline-cheatsheets");
      showToast({
        style: Toast.Style.Success,
        title: "Cleared",
        message: "Offline storage has been cleared",
      });
    } catch (error) {
      console.error("Failed to clear offline storage:", error);
      throw error;
    }
  }

  // Enhanced list files with offline storage
  static async listFiles(): Promise<File[]> {
    try {
      const prefs = this.getPreferences() as ExtendedPreferences;
      // 1) Prefer bundled local cheatsheets
      const local = this.listLocalCheatsheets();
      if (local.length > 0) return local;
      // If no token is configured or we are in backoff, avoid hitting GitHub at all
      if (!prefs.githubToken || Date.now() < this.RATE_LIMIT_UNTIL_MS) {
        try {
          const offline = await this.getOfflineCheatsheets();
          if (prefs.enableOfflineStorage && offline.length > 0) {
            showToast({
              style: Toast.Style.Animated,
              title: "Offline Mode",
              message: `Using ${offline.length} cached cheatsheets`,
            });
            const offlineAsFiles: File[] = offline.map((s) => ({
              path: `${s.slug}.md`,
              mode: "100644",
              type: "blob",
              sha: `offline-${s.slug}`,
              size: s.size,
              url: "",
            }));
            return offlineAsFiles;
          }
        } catch (e) {
          console.warn("Failed to use offline list fallback:", e);
        }
        return this.staticFileList();
      }

      // If we recently got rate limited, skip network call and use static list
      if (Date.now() < this.RATE_LIMIT_UNTIL_MS) {
        return this.staticFileList();
      }

      const response = await listClient.get<ListResponse>(`/${BRANCH}`, {
        params: { recursive: 1 },
        headers: { Authorization: `Bearer ${prefs.githubToken}` },
      });
      return response.data.tree;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("Failed to fetch from GitHub API:", msg);
      // Surface a helpful message on rate limit
      try {
        let status: number | undefined;
        if (axios.isAxiosError(error)) {
          status = error.response?.status;
        }
        if (status === 403) {
          this.RATE_LIMIT_UNTIL_MS = Date.now() + 15 * 60 * 1000; // back off for 15 minutes
          if (Date.now() - this.LAST_RATE_TOAST_AT_MS > this.RATE_TOAST_COOLDOWN_MS) {
            this.LAST_RATE_TOAST_AT_MS = Date.now();
            showToast({
              style: Toast.Style.Failure,
              title: "GitHub Rate Limited",
              message: "Falling back to built-in list. Add a token in preferences to avoid limits.",
            });
          }
        }
      } catch {
        // ignore toast errors
      }

      // Prefer offline list if available and enabled
      try {
        const prefs = this.getPreferences();
        const offline = await this.getOfflineCheatsheets();
        if (prefs.enableOfflineStorage && offline.length > 0) {
          showToast({
            style: Toast.Style.Animated,
            title: "Offline Mode",
            message: `Using ${offline.length} cached cheatsheets`,
          });
          // Map offline slugs to File-like objects (only fields we use)
          const offlineAsFiles: File[] = offline.map((s) => ({
            path: `${s.slug}.md`,
            mode: "100644",
            type: "blob",
            sha: `offline-${s.slug}`,
            size: s.size,
            url: "",
          }));
          return offlineAsFiles;
        }
      } catch (e) {
        console.warn("Failed to use offline list fallback:", e);
      }

      // Fallback to a richer static list based on known metadata keys
      return this.staticFileList();
    }
  }

  // Enhanced get sheet with offline storage
  static async getSheet(slug: string): Promise<string> {
    try {
      // 1) Prefer bundled local cheatsheets
      const local = this.readLocalCheatsheet(slug);
      if (local) return local;
      // Always try to fetch from GitHub first by default
      const response = await fileClient.get<string>(`/${slug}.md`);
      const content = response.data;

      // Only save to offline storage if explicitly enabled
      const preferences = this.getPreferences();
      if (preferences.enableOfflineStorage) {
        try {
          await this.saveOfflineCheatsheet(slug, content);
        } catch (error) {
          console.warn("Failed to save to offline storage:", error);
        }
      }

      return content;
    } catch (error) {
      console.warn(`Failed to fetch sheet ${slug}, trying offline storage:`, error);
      // Fallback 1: Fetch from devhints.io and convert basic HTML → Markdown
      try {
        const htmlResp = await axios.get<string>(`https://devhints.io/${slug}`, {
          timeout: 10000,
          headers: { "User-Agent": "Cheatsheets-Remastered-Raycast" },
        });
        const html = htmlResp.data || "";
        const md = this.convertDevHintsHtmlToMarkdown(html, slug);
        if (md && md.trim()) {
          const preferences = this.getPreferences();
          if (preferences.enableOfflineStorage) {
            try {
              await this.saveOfflineCheatsheet(slug, md);
            } catch {
              void 0;
            }
          }
          return md;
        }
      } catch (e) {
        console.warn("devhints fallback failed:", e);
      }

      // Try offline storage as fallback only if enabled
      const prefs = this.getPreferences();
      if (prefs?.enableOfflineStorage) {
        const offlineSheet = await this.getOfflineCheatsheet(slug);
        if (offlineSheet) {
          // No noisy toast per-item during bulk offline usage
          return offlineSheet.content;
        }
      }

      // Use mock data as last resort
      const mockContent = mockSheets[slug as keyof typeof mockSheets];
      if (mockContent) {
        showToast({
          style: Toast.Style.Failure,
          title: "Offline Mode",
          message: `Using mock data for ${slug}`,
        });
        return mockContent;
      }

      return `# ${slug}\n\nContent not available. Please check your internet connection.`;
    }
  }

  private static convertDevHintsHtmlToMarkdown(html: string, slug: string): string {
    function stripTags(x: string): string {
      return x.replace(/<[^>]+>/g, "");
    }
    function decodeHtml(x: string): string {
      return x
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }

    try {
      let s = html;
      // Remove scripts/styles
      s = s.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
      // Extract main content (best-effort)
      const mainMatch =
        s.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i) || s.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
      s = mainMatch ? mainMatch[1] : s;
      // Code blocks
      s = s.replace(
        /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
        (_m, p1) => "```\n" + decodeHtml(p1).trim() + "\n```",
      );
      // Headings
      for (let i = 6; i >= 1; i--) {
        const re = new RegExp(`<h${i}[^>]*>([\n\\s\\S]*?)<\\/h${i}>`, "gi");
        s = s.replace(re, (_m, p1) => `${"#".repeat(i)} ${stripTags(decodeHtml(p1)).trim()}\n\n`);
      }
      // Lists
      s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, p1) => `- ${stripTags(decodeHtml(p1)).trim()}\n`);
      s = s.replace(/<ul[^>]*>/gi, "\n").replace(/<\/ul>/gi, "\n");
      s = s.replace(/<ol[^>]*>/gi, "\n").replace(/<\/ol>/gi, "\n");
      // Paragraphs and line breaks
      s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, p1) => `${stripTags(decodeHtml(p1)).trim()}\n\n`);
      s = s.replace(/<br\s*\/>/gi, "\n");
      // Links → just keep text
      s = s.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, (_m, p1) => stripTags(decodeHtml(p1)));
      // Strip remaining tags
      s = stripTags(s);
      // Title header
      const title = slug.split("/").pop() || slug;
      const out = `# ${title}\n\n${s}`.replace(/\n{3,}/g, "\n\n").trim();
      return out;
    } catch (e) {
      console.warn("convertDevHintsHtmlToMarkdown failed:", e);
      return "";
    }
  }

  // Bulk download for offline storage
  static async downloadAllForOffline(): Promise<{
    success: number;
    failed: number;
  }> {
    try {
      const preferences = this.getPreferences();
      if (!preferences.enableOfflineStorage) {
        throw new Error("Offline storage is disabled");
      }

      showToast({
        style: Toast.Style.Animated,
        title: "Downloading",
        message: "Fetching all cheatsheets for offline use...",
      });

      const files = await this.listFiles();
      const sheets = getSheets(files);
      let success = 0;
      let failed = 0;

      for (const sheet of sheets) {
        try {
          const content = await this.getSheet(sheet);
          await this.saveOfflineCheatsheet(sheet, content);
          success++;
        } catch (error) {
          console.warn(`Failed to download ${sheet}:`, error);
          failed++;
        }
      }

      showToast({
        style: Toast.Style.Success,
        title: "Download Complete",
        message: `${success} cheatsheets downloaded, ${failed} failed`,
      });

      return { success, failed };
    } catch (error) {
      console.error("Failed to download all cheatsheets:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Download Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  static urlFor(slug: string) {
    return `https://devhints.io/${slug}`;
  }

  // Default cheatsheet metadata (tags/aliases/description)
  static getDefaultMetadata(slug: string): DefaultMetadata {
    const key = slug.toLowerCase();
    const base = key.split("/").pop() || key;
    const byKey = DEFAULT_SHEET_METADATA[key];
    const byBase = DEFAULT_SHEET_METADATA[base];
    if (byKey) return byKey;
    if (byBase) return byBase;
    return this.deriveDefaultMetadata(base);
  }

  private static deriveDefaultMetadata(slug: string): DefaultMetadata {
    const base = slug.toLowerCase();
    const rawTokens = base
      .split(/[/_.-]+/)
      .filter(Boolean)
      .filter((t) => t.length >= 2);

    const aliasMap: Record<string, string[]> = {
      js: ["javascript"],
      ts: ["typescript"],
      k8s: ["kubernetes"],
      psql: ["postgres", "postgresql"],
      mac: ["macos"],
      osx: ["macos"],
      sh: ["shell"],
      cli: ["terminal"],
      node: ["nodejs"],
    };

    const tokens = new Set<string>();
    for (const t of rawTokens) {
      tokens.add(t);
      const aliases = aliasMap[t];
      if (aliases) {
        for (const a of aliases) tokens.add(a);
      }
    }

    // Provide a couple of generic buckets so default sheets always have some tags
    const generics: string[] = [];
    if (tokens.has("git")) generics.push("vcs");
    if (tokens.has("docker")) generics.push("containers");
    if (tokens.has("npm") || tokens.has("yarn") || tokens.has("pnpm")) generics.push("packages");
    if (tokens.has("bash") || tokens.has("zsh") || tokens.has("fish")) generics.push("shell");
    generics.forEach((g) => tokens.add(g));

    return { tags: Array.from(tokens) };
  }

  static defaultMatchesQuery(slug: string, query: string): boolean {
    const q = query.toLowerCase();
    if (slug.toLowerCase().includes(q)) return true;
    const md = this.getDefaultMetadata(slug);
    return (
      (md.tags && md.tags.some((t) => t.toLowerCase().includes(q))) ||
      (md.aliases && md.aliases.some((a) => a.toLowerCase().includes(q))) ||
      (md.description && md.description.toLowerCase().includes(q))
    );
  }

  // Fast content search across default cheatsheets using GitHub code search
  static async searchDefaultContent(query: string): Promise<string[]> {
    try {
      const prefs = this.getPreferences() as ExtendedPreferences;
      // Try local content search first
      const localResults = this.searchLocalContent(query);
      if (localResults.length > 0) return localResults;
      if (!prefs.githubToken || Date.now() < this.RATE_LIMIT_UNTIL_MS) return [];
      if (!query || query.trim().length < 3) return [];
      const safe = query.replace(/[@#]/g, " ").replace(/\s+/g, " ").trim();
      const q = `${JSON.stringify(safe)} repo:${OWNER}/${REPO} in:file extension:md`;
      const resp = await searchClient.get<{ items: Array<{ path: string }> }>(``, {
        params: { q, per_page: 50 },
        headers: { Authorization: `Bearer ${prefs.githubToken}` },
      });
      const items = resp.data.items || [];
      const slugs = items
        .map((it) => it.path)
        .filter((p) => !/(^README|^CONTRIBUTING|^index|^index@2016)\.md/i.test(p))
        // Exclude underscore directories like _includes, _layouts, etc.
        .filter((p) => !/(^|\/)_[^/]+\//.test(p))
        .map((p) => p.replace(/\.md$/i, ""));
      // De-duplicate while preserving order
      const seen = new Set<string>();
      const unique = slugs.filter((s) => (seen.has(s) ? false : (seen.add(s), true)));
      return unique;
    } catch (error) {
      console.warn("Default content search failed:", error);
      return [];
    }
  }

  private static staticFileList(): File[] {
    // Build a larger static list by scraping devhints sitemap (best-effort, cached in memory)
    let slugs: string[] = [];
    const now = Date.now();
    if (this.DEVHINTS_SITEMAP_CACHE && now - this.DEVHINTS_SITEMAP_CACHE_AT_MS < 24 * 60 * 60 * 1000) {
      slugs = this.DEVHINTS_SITEMAP_CACHE;
    } else {
      try {
        const resp = fs.readFileSync(path.join(environment.assetsPath, "devhints-sitemap.txt"), "utf8");
        slugs = resp
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
      } catch {
        // Fallback to baked-in set if sitemap not available
        slugs = [
          ...Object.keys(DEFAULT_SHEET_METADATA),
          "javascript",
          "typescript",
          "python",
          "ruby",
          "go",
          "rust",
          "php",
          "java",
          "kotlin",
          "swift",
          "html",
          "css",
          "react",
          "nextjs",
          "vue",
          "svelte",
          "angular",
          "bash",
          "zsh",
          "fish",
          "linux",
          "mac",
          "tmux",
          "vim",
          "emacs",
          "git",
          "github",
          "docker",
          "kubernetes",
          "npm",
          "yarn",
          "pnpm",
          "node",
          "nvm",
          "brew",
          "jq",
          "curl",
          "http",
          "ssh",
          "sed",
          "awk",
          "grep",
          "make",
          "sql",
          "postgres",
          "mysql",
          "sqlite",
          "redis",
          "mongodb",
          "graphql",
          "aws",
          "terraform",
          "nginx",
          "101",
        ];
      }
      this.DEVHINTS_SITEMAP_CACHE = Array.from(new Set(slugs));
      this.DEVHINTS_SITEMAP_CACHE_AT_MS = now;
    }
    const staticSlugs = Array.from(new Set(slugs));
    return staticSlugs.map((slug) => ({
      path: `${slug}.md`,
      mode: "100644",
      type: "blob",
      sha: `static-${slug}`,
      size: 0,
      url: "",
    }));
  }

  // ---------- Local bundled cheatsheets ----------
  private static listLocalCheatsheets(): File[] {
    try {
      if (!fs.existsSync(this.LOCAL_SHEETS_DIR)) return [];
      const entries: string[] = [];
      const walk = (dir: string) => {
        for (const name of fs.readdirSync(dir)) {
          const p = path.join(dir, name);
          const st = fs.statSync(p);
          if (st.isDirectory()) walk(p);
          else if (/\.md$/i.test(name)) entries.push(p);
        }
      };
      walk(this.LOCAL_SHEETS_DIR);
      return entries.map((abs) => {
        const rel = path.relative(this.LOCAL_SHEETS_DIR, abs).replace(/\\/g, "/");
        const slug = rel.replace(/\.md$/i, "");
        return {
          path: `${slug}.md`,
          mode: "100644",
          type: "blob",
          sha: `local-${slug}`,
          size: fs.statSync(abs).size,
          url: "",
        } as File;
      });
    } catch (e) {
      console.warn("listLocalCheatsheets failed:", e);
      return [];
    }
  }

  private static readLocalCheatsheet(slug: string): string | null {
    try {
      const p = path.join(this.LOCAL_SHEETS_DIR, `${slug}.md`);
      if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
      return null;
    } catch {
      return null;
    }
  }

  // Public helper to know if a cheatsheet comes from the bundled local assets
  static isLocalCheatsheet(slug: string): boolean {
    try {
      const p = path.join(this.LOCAL_SHEETS_DIR, `${slug}.md`);
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }

  private static searchLocalContent(query: string): string[] {
    try {
      const q = (query || "").trim();
      if (q.length < 3) return [];
      const files = this.listLocalCheatsheets();
      const results: string[] = [];
      for (const f of files) {
        const content = this.readLocalCheatsheet(f.path.replace(/\.md$/i, ""));
        if (content && content.toLowerCase().includes(q.toLowerCase())) {
          results.push(f.path.replace(/\.md$/i, ""));
        }
      }
      return Array.from(new Set(results));
    } catch {
      return [];
    }
  }

  // View history management
  static async getViewHistory(): Promise<ViewRecord[]> {
    try {
      const json = await LocalStorage.getItem<string>("cheatsheet-views");
      return json ? (JSON.parse(json) as ViewRecord[]) : [];
    } catch (error) {
      console.warn("Failed to load view history:", error);
      return [];
    }
  }

  static async recordView(type: "custom" | "default" | "repository", slug: string, title: string): Promise<void> {
    try {
      const key = `${type}:${slug}`;
      const views = await this.getViewHistory();
      const idx = views.findIndex((v) => v.key === key);
      const now = Date.now();
      if (idx >= 0) {
        views[idx].count += 1;
        views[idx].lastViewedAt = now;
        views[idx].title = title;
      } else {
        views.push({ key, type, slug, title, count: 1, lastViewedAt: now });
      }
      await LocalStorage.setItem("cheatsheet-views", JSON.stringify(views));
    } catch (error) {
      console.warn("Failed to record view:", error);
    }
  }

  static async getViewStatsMap(): Promise<Record<string, { count: number; lastViewedAt: number }>> {
    const views = await this.getViewHistory();
    return views.reduce(
      (acc, v) => {
        acc[v.key] = { count: v.count, lastViewedAt: v.lastViewedAt };
        return acc;
      },
      {} as Record<string, { count: number; lastViewedAt: number }>,
    );
  }

  // Enhanced custom cheatsheet methods with validation
  static async getCustomCheatsheets(): Promise<CustomCheatsheet[]> {
    try {
      const customSheetsJson = await LocalStorage.getItem<string>("custom-cheatsheets");
      const sheets = customSheetsJson ? JSON.parse(customSheetsJson) : [];

      // Validate and clean data
      return (sheets as unknown[]).filter(isCustomCheatsheet);
    } catch (error) {
      console.warn("Failed to get custom cheatsheets:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Storage Error",
        message: "Failed to load custom cheatsheets",
      });
      return [];
    }
  }

  static async createCustomCheatsheet(
    title: string,
    content: string,
    tags?: string[],
    description?: string,
  ): Promise<CustomCheatsheet> {
    try {
      // Validate input
      if (!title.trim() || !content.trim()) {
        throw new Error("Title and content are required");
      }

      const customSheets = await this.getCustomCheatsheets();
      const newSheet: CustomCheatsheet = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        content: content.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: tags?.filter((tag) => tag.trim()),
        description: description?.trim(),
      };

      customSheets.push(newSheet);
      await LocalStorage.setItem("custom-cheatsheets", JSON.stringify(customSheets));

      showToast({
        style: Toast.Style.Success,
        title: "Created",
        message: `"${title}" has been added`,
      });

      return newSheet;
    } catch (error) {
      console.error("Failed to create custom cheatsheet:", error);
      throw error;
    }
  }

  static async updateCustomCheatsheet(
    id: string,
    title: string,
    content: string,
    tags?: string[],
    description?: string,
  ): Promise<CustomCheatsheet | null> {
    try {
      if (!title.trim() || !content.trim()) {
        throw new Error("Title and content are required");
      }

      const customSheets = await this.getCustomCheatsheets();
      const index = customSheets.findIndex((sheet) => sheet.id === id);

      if (index === -1) return null;

      customSheets[index] = {
        ...customSheets[index],
        title: title.trim(),
        content: content.trim(),
        updatedAt: Date.now(),
        tags: tags?.filter((tag) => tag.trim()),
        description: description?.trim(),
      };

      await LocalStorage.setItem("custom-cheatsheets", JSON.stringify(customSheets));

      showToast({
        style: Toast.Style.Success,
        title: "Updated",
        message: `"${title}" has been modified`,
      });

      return customSheets[index];
    } catch (error) {
      console.error("Failed to update custom cheatsheet:", error);
      throw error;
    }
  }

  static async deleteCustomCheatsheet(id: string): Promise<boolean> {
    try {
      const customSheets = await this.getCustomCheatsheets();
      const filteredSheets = customSheets.filter((sheet) => sheet.id !== id);

      if (filteredSheets.length === customSheets.length) return false;

      await LocalStorage.setItem("custom-cheatsheets", JSON.stringify(filteredSheets));
      return true;
    } catch (error) {
      console.error("Failed to delete custom cheatsheet:", error);
      throw error;
    }
  }

  static async getCustomCheatsheet(id: string): Promise<CustomCheatsheet | null> {
    try {
      const customSheets = await this.getCustomCheatsheets();
      return customSheets.find((sheet) => sheet.id === id) || null;
    } catch (error) {
      console.error("Failed to get custom cheatsheet:", error);
      return null;
    }
  }

  // Search functionality
  static async searchCustomCheatsheets(query: string): Promise<CustomCheatsheet[]> {
    try {
      const customSheets = await this.getCustomCheatsheets();
      const lowerQuery = query.toLowerCase();

      return customSheets.filter(
        (sheet) =>
          sheet.title.toLowerCase().includes(lowerQuery) ||
          sheet.content.toLowerCase().includes(lowerQuery) ||
          sheet.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
          sheet.description?.toLowerCase().includes(lowerQuery),
      );
    } catch (error) {
      console.error("Failed to search custom cheatsheets:", error);
      return [];
    }
  }

  // Backup and restore functionality
  static async exportCustomCheatsheets(): Promise<string> {
    try {
      const customSheets = await this.getCustomCheatsheets();
      return JSON.stringify(customSheets, null, 2);
    } catch (error) {
      console.error("Failed to export custom cheatsheets:", error);
      throw error;
    }
  }

  static async importCustomCheatsheets(jsonData: string): Promise<number> {
    try {
      const data = JSON.parse(jsonData);
      if (!Array.isArray(data)) {
        throw new Error("Invalid data format");
      }

      // Validate each cheatsheet
      const validSheets = (data as unknown[]).filter(isImportedCheatsheetInput);

      if (validSheets.length === 0) {
        throw new Error("No valid cheatsheets found");
      }

      // Add import timestamp and generate new IDs
      const importedSheets: CustomCheatsheet[] = validSheets.map((sheet) => ({
        id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: sheet.title,
        content: sheet.content,
        tags: sheet.tags,
        description: sheet.description,
        createdAt: sheet.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      }));

      const existingSheets = await this.getCustomCheatsheets();
      const allSheets = [...existingSheets, ...importedSheets];

      await LocalStorage.setItem("custom-cheatsheets", JSON.stringify(allSheets));

      showToast({
        style: Toast.Style.Success,
        title: "Imported",
        message: `${importedSheets.length} cheatsheets imported`,
      });

      return importedSheets.length;
    } catch (error) {
      console.error("Failed to import custom cheatsheets:", error);
      throw error;
    }
  }

  // Favorite management
  static async getFavorites(): Promise<FavoriteCheatsheet[]> {
    try {
      const favoritesJson = await LocalStorage.getItem<string>("favorite-cheatsheets");
      return favoritesJson ? JSON.parse(favoritesJson) : [];
    } catch (error) {
      console.warn("Failed to load favorites:", error);
      return [];
    }
  }

  static async addToFavorites(type: "custom" | "default" | "repository", slug: string, title: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const existingIndex = favorites.findIndex((fav) => fav.slug === slug && fav.type === type);

      if (existingIndex >= 0) {
        // Update existing favorite
        favorites[existingIndex].favoritedAt = Date.now();
      } else {
        // Add new favorite
        const newFavorite: FavoriteCheatsheet = {
          id: `${type}-${slug}-${Date.now()}`,
          type,
          slug,
          title,
          favoritedAt: Date.now(),
        };
        favorites.push(newFavorite);
      }

      await LocalStorage.setItem("favorite-cheatsheets", JSON.stringify(favorites));
    } catch (error) {
      console.error("Failed to add to favorites:", error);
      throw error;
    }
  }

  static async removeFromFavorites(type: "custom" | "default" | "repository", slug: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filtered = favorites.filter((fav) => !(fav.slug === slug && fav.type === type));
      await LocalStorage.setItem("favorite-cheatsheets", JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to remove from favorites:", error);
      throw error;
    }
  }

  static async isFavorited(type: "custom" | "default" | "repository", slug: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some((fav) => fav.slug === slug && fav.type === type);
    } catch (error) {
      console.error("Failed to check favorite status:", error);
      return false;
    }
  }

  static async toggleFavorite(
    type: "custom" | "default" | "repository",
    slug: string,
    title: string,
  ): Promise<boolean> {
    try {
      const isFavorited = await this.isFavorited(type, slug);

      if (isFavorited) {
        await this.removeFromFavorites(type, slug);
        return false;
      } else {
        await this.addToFavorites(type, slug, title);
        return true;
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      throw error;
    }
  }

  // Hidden cheatsheets management
  static async getHiddenCheatsheets(): Promise<HiddenCheatsheet[]> {
    try {
      const stored = await LocalStorage.getItem("hidden-cheatsheets");
      return stored ? JSON.parse(stored as string) : [];
    } catch (error) {
      console.error("Failed to get hidden cheatsheets:", error);
      return [];
    }
  }

  static async hideCheatsheet(type: "custom" | "default" | "repository", slug: string, title: string): Promise<void> {
    try {
      const hidden = await this.getHiddenCheatsheets();
      const key = `${type}:${slug}`;
      const existingIndex = hidden.findIndex((item) => item.key === key);

      if (existingIndex >= 0) {
        // Update existing hidden item
        hidden[existingIndex].hiddenAt = Date.now();
      } else {
        // Add new hidden item
        const newHidden: HiddenCheatsheet = {
          key,
          type,
          slug,
          title,
          hiddenAt: Date.now(),
        };
        hidden.push(newHidden);
      }

      await LocalStorage.setItem("hidden-cheatsheets", JSON.stringify(hidden));
    } catch (error) {
      console.error("Failed to hide cheatsheet:", error);
      throw error;
    }
  }

  static async showCheatsheet(type: "custom" | "default" | "repository", slug: string): Promise<void> {
    try {
      const hidden = await this.getHiddenCheatsheets();
      const key = `${type}:${slug}`;
      const filtered = hidden.filter((item) => item.key !== key);
      await LocalStorage.setItem("hidden-cheatsheets", JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to show cheatsheet:", error);
      throw error;
    }
  }

  static async isHidden(type: "custom" | "default" | "repository", slug: string): Promise<boolean> {
    try {
      const hidden = await this.getHiddenCheatsheets();
      const key = `${type}:${slug}`;
      return hidden.some((item) => item.key === key);
    } catch (error) {
      console.error("Failed to check if cheatsheet is hidden:", error);
      return false;
    }
  }

  static async toggleHidden(type: "custom" | "default" | "repository", slug: string, title: string): Promise<boolean> {
    try {
      const isCurrentlyHidden = await this.isHidden(type, slug);
      if (isCurrentlyHidden) {
        await this.showCheatsheet(type, slug);
        return false;
      } else {
        await this.hideCheatsheet(type, slug, title);
        return true;
      }
    } catch (error) {
      console.error("Failed to toggle hidden status:", error);
      throw error;
    }
  }

  // GitHub repository validation
  static validateGitHubRepository(owner: string, repo: string): { isValid: boolean; error?: string } {
    if (!owner.trim() || !repo.trim()) {
      return { isValid: false, error: "Owner and repository name are required" };
    }

    // Validate owner format (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9._-]+$/.test(owner.trim())) {
      return {
        isValid: false,
        error: "Invalid owner format. Use alphanumeric characters, hyphens, underscores, or dots",
      };
    }

    // Validate repo format (alphanumeric, hyphens, underscores, dots)
    if (!/^[a-zA-Z0-9._-]+$/.test(repo.trim())) {
      return {
        isValid: false,
        error: "Invalid repository name format. Use alphanumeric characters, hyphens, underscores, or dots",
      };
    }

    return { isValid: true };
  }

  // Repository management methods
  static async getUserRepositories(): Promise<UserRepository[]> {
    try {
      const reposJson = await LocalStorage.getItem<string>("user-repositories");
      if (!reposJson) return [];

      const originalRepos = JSON.parse(reposJson);

      // Migration logic for schema changes
      const migratedRepos = this.migrateUserRepositories(originalRepos);

      // Check if migration occurred by comparing structure
      const migrationNeeded = this.detectMigrationNeeded(originalRepos, migratedRepos);
      if (migrationNeeded) {
        // Save migrated data back to LocalStorage
        await this.saveMigratedRepositories(migratedRepos);
        console.log("Repository schema migration completed");
      }

      return migratedRepos;
    } catch (error) {
      console.warn("Failed to load user repositories:", error);
      return [];
    }
  }

  // Detect if migration was needed by comparing original and migrated data
  private static detectMigrationNeeded(original: unknown[], migrated: UserRepository[]): boolean {
    if (original.length !== migrated.length) return true;

    return original.some((repo) => {
      const repoObj = repo as Record<string, unknown>;
      return (
        !repoObj.id ||
        !repoObj.name ||
        !repoObj.defaultBranch ||
        repoObj.repo !== undefined || // Legacy 'repo' field
        repoObj.branch !== undefined // Legacy 'branch' field
      );
    });
  }

  // Migration logic for user repository schema changes
  private static migrateUserRepositories(repos: unknown[]): UserRepository[] {
    if (!Array.isArray(repos)) return [];

    return repos.map((repo: unknown) => {
      const repoObj = repo as Record<string, unknown>;
      // Ensure required fields exist with defaults
      const migratedRepo: UserRepository = {
        id: (repoObj.id as string) || `repo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: (repoObj.name as string) || (repoObj.repo as string) || "Unknown",
        owner: (repoObj.owner as string) || "unknown",
        description: repoObj.description as string | undefined,
        url:
          (repoObj.url as string) ||
          `https://github.com/${(repoObj.owner as string) || "unknown"}/${(repoObj.name as string) || (repoObj.repo as string) || "unknown"}`,
        addedAt: (repoObj.addedAt as number) || Date.now(),
        lastAccessedAt: repoObj.lastAccessedAt as number | undefined,
        isPrivate: (repoObj.isPrivate as boolean) || false,
        defaultBranch: (repoObj.defaultBranch as string) || (repoObj.branch as string) || "main",
        subdirectory: repoObj.subdirectory as string | undefined,
        lastSyncedAt: repoObj.lastSyncedAt as number | undefined,
      };

      // Handle legacy schema where 'repo' was used instead of 'name'
      if (repoObj.repo && !repoObj.name) {
        migratedRepo.name = repoObj.repo as string;
      }

      // Handle legacy schema where 'branch' was used instead of 'defaultBranch'
      if (repoObj.branch && !repoObj.defaultBranch) {
        migratedRepo.defaultBranch = repoObj.branch as string;
      }

      return migratedRepo;
    });
  }

  // Save migrated repositories back to LocalStorage if migration occurred
  private static async saveMigratedRepositories(repos: UserRepository[]): Promise<void> {
    try {
      await LocalStorage.setItem("user-repositories", JSON.stringify(repos));
    } catch (error) {
      console.warn("Failed to save migrated repositories:", error);
    }
  }

  static async addUserRepository(
    name: string,
    owner: string,
    description?: string,
    url?: string,
    isPrivate: boolean = false,
    defaultBranch: string = "main",
    subdirectory?: string,
  ): Promise<UserRepository> {
    try {
      // Validate GitHub repository format
      const validation = this.validateGitHubRepository(owner, name);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const repos = await this.getUserRepositories();

      // Check if repository already exists
      const existingRepo = repos.find(
        (repo) => repo.name.toLowerCase() === name.toLowerCase() && repo.owner.toLowerCase() === owner.toLowerCase(),
      );

      if (existingRepo) {
        throw new Error("Repository already exists in your list");
      }

      const newRepo: UserRepository = {
        id: `repo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        owner: owner.trim(),
        description: description?.trim(),
        url: url?.trim() || `https://github.com/${owner}/${name}`,
        addedAt: Date.now(),
        isPrivate,
        defaultBranch: defaultBranch.trim() || "main",
        subdirectory: subdirectory?.trim() || undefined,
        lastSyncedAt: undefined,
      };

      repos.push(newRepo);
      await LocalStorage.setItem("user-repositories", JSON.stringify(repos));

      showToast({
        style: Toast.Style.Success,
        title: "Repository Added",
        message: `${owner}/${name} has been added to your repositories`,
      });

      return newRepo;
    } catch (error) {
      console.error("Failed to add repository:", error);
      throw error;
    }
  }

  static async removeUserRepository(id: string): Promise<boolean> {
    try {
      const repos = await this.getUserRepositories();
      const filteredRepos = repos.filter((repo) => repo.id !== id);

      if (filteredRepos.length === repos.length) {
        return false; // Repository not found
      }

      await LocalStorage.setItem("user-repositories", JSON.stringify(filteredRepos));

      showToast({
        style: Toast.Style.Success,
        title: "Repository Removed",
        message: "Repository has been removed from your list",
      });

      return true;
    } catch (error) {
      console.error("Failed to remove repository:", error);
      throw error;
    }
  }

  static async updateUserRepository(
    id: string,
    updates: Partial<
      Pick<UserRepository, "name" | "owner" | "description" | "url" | "defaultBranch" | "subdirectory" | "lastSyncedAt">
    >,
  ): Promise<UserRepository | null> {
    try {
      const repos = await this.getUserRepositories();
      const index = repos.findIndex((repo) => repo.id === id);

      if (index === -1) return null;

      // Validate if name or owner are being updated
      if (updates.name || updates.owner) {
        const validation = this.validateGitHubRepository(
          updates.owner || repos[index].owner,
          updates.name || repos[index].name,
        );
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
      }

      repos[index] = {
        ...repos[index],
        ...updates,
      };

      await LocalStorage.setItem("user-repositories", JSON.stringify(repos));

      showToast({
        style: Toast.Style.Success,
        title: "Repository Updated",
        message: "Repository details have been updated",
      });

      return repos[index];
    } catch (error) {
      console.error("Failed to update repository:", error);
      throw error;
    }
  }

  // Sync repository files from GitHub using OAuth token
  static async syncRepositoryFiles(
    repo: UserRepository,
    accessToken: string,
  ): Promise<{ success: number; failed: number }> {
    try {
      // Validate repository parameters
      if (!repo.owner || !repo.name) {
        throw new Error("Invalid repository: missing owner or name");
      }

      if (!repo.defaultBranch) {
        throw new Error("Invalid repository: missing default branch");
      }

      if (!accessToken) {
        throw new Error("GitHub token required for repository sync");
      }

      showToast({
        style: Toast.Style.Animated,
        title: "Syncing Repository",
        message: `Fetching files from ${repo.owner}/${repo.name}...`,
      });

      // Build API URL with optional subdirectory
      const treeUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}/git/trees/${repo.defaultBranch}`;
      const params: Record<string, unknown> = { recursive: 1 };

      const response = await axios
        .get(treeUrl, {
          params,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Cheatsheets-Remastered-Raycast",
          },
          timeout: 15000,
        })
        .catch((error) => {
          // Handle specific GitHub API errors
          if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            switch (status) {
              case 404:
                if (data.message?.includes("Not Found")) {
                  throw new Error(`Repository ${repo.owner}/${repo.name} not found or you don't have access to it`);
                } else if (data.message?.includes("tree not found")) {
                  throw new Error(`Branch '${repo.defaultBranch}' not found in repository ${repo.owner}/${repo.name}`);
                }
                break;
              case 403:
                if (data.message?.includes("API rate limit exceeded")) {
                  throw new Error("GitHub API rate limit exceeded. Please try again later");
                } else if (data.message?.includes("Resource not accessible")) {
                  throw new Error(`Access denied to repository ${repo.owner}/${repo.name}. Check permissions`);
                }
                break;
              case 401:
                throw new Error("GitHub authentication failed. Please re-authenticate");
              case 422:
                throw new Error(`Invalid repository or branch: ${repo.owner}/${repo.name}#${repo.defaultBranch}`);
              default:
                throw new Error(`GitHub API error (${status}): ${data.message || "Unknown error"}`);
            }
          } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
            throw new Error("Unable to connect to GitHub. Please check your internet connection");
          } else if (error.code === "ETIMEDOUT") {
            throw new Error("Request timed out. Please try again");
          }

          throw error;
        });

      const files = response.data.tree || [];

      // Filter markdown files and apply subdirectory filter
      // Comprehensive exclusion system to ensure only valid cheatsheets are imported
      const markdownFiles = files.filter((file: Record<string, unknown>) => {
        // Basic requirements
        const isMarkdown = (file.path as string)?.endsWith(".md");

        // Subdirectory logic: if subdirectory is set, only sync that subdirectory
        // If no subdirectory is set, sync ALL files in ALL subdirectories
        const filePath = file.path as string;
        const isInSubdir = !repo.subdirectory || filePath.startsWith(repo.subdirectory + "/");

        // Debug logging for all files
        if (isMarkdown) {
          console.log(
            `Processing file: ${filePath} (isMarkdown: ${isMarkdown}, isInSubdir: ${isInSubdir}, subdirectory: '${repo.subdirectory || "none"}')`,
          );
        }

        // Skip if not markdown or not in subdirectory
        if (!isMarkdown || !isInSubdir) {
          if (isMarkdown && !isInSubdir) {
            console.log(
              `Excluding file (not in subdirectory): ${filePath} (subdirectory: ${repo.subdirectory || "none"})`,
            );
          }
          return false;
        }

        // Admin and documentation file exclusions - be more precise
        const isNotAdminFile = !filePath.match(/^(README|CONTRIBUTING|index|index@2016)\.md$/i);
        const isNotInGitHubDir = !filePath.startsWith(".github/");
        const isNotCodeOfConduct = !filePath.match(/code[_-]of[_-]conduct\.md$/i);
        const isNotLicense = !filePath.match(/^(LICENSE|LICENCE)\.md$/i);
        const isNotChangelog = !filePath.match(/^(CHANGELOG|HISTORY)\.md$/i);
        const isNotSecurity = !filePath.match(/^(SECURITY|SECURITY\.md)$/i);
        const isNotContributing = !filePath.match(/^(CONTRIBUTING|CONTRIBUTING\.md)$/i);
        const isNotPullRequestTemplate = !filePath.match(/pull_request_template\.md$/i);
        const isNotIssueTemplate = !filePath.startsWith(".github/ISSUE_TEMPLATE/");
        const isNotWorkflow = !filePath.startsWith(".github/workflows/");
        const isNotReleaseNotes = !filePath.match(/^(RELEASES?|RELEASE[_-]NOTES?)\.md$/i);
        const isNotAuthors = !filePath.match(/^(AUTHORS?|CONTRIBUTORS?)\.md$/i);
        const isNotRoadmap = !filePath.match(/^(ROADMAP|ROAD[_-]MAP)\.md$/i);
        const isNotTodo = !filePath.match(/^(TODO|TASKS?)\.md$/i);
        const isNotInstallation = !filePath.match(/^(INSTALL|INSTALLATION)\.md$/i);
        const isNotGettingStarted = !filePath.match(/^(GETTING[_-]STARTED|QUICK[_-]START)\.md$/i);

        // Directory and file pattern exclusions (as per requirements)
        const isNotInUnderscoreDir = !filePath.match(/(^|\/)_[^/]+/); // Exclude dirs starting with _
        const isNotAtSymbolFile = !filePath.includes("@"); // Exclude files with @ in name
        const isNotInUnderscoreFile = !filePath.match(/(^|\/)_[^/]*\.md$/); // Exclude files starting with _ in filename

        // Additional exclusions for common non-cheatsheet files
        const isNotIndexFile = !filePath.match(
          /^(Index|IndexASVS|IndexMASVS|IndexProactiveControls|IndexTopTen)\.md$/i,
        );
        const isNotPrefaceFile = !filePath.match(/^(Preface|HelpGuide)\.md$/i);
        const isNotProjectFile = !filePath.match(/^Project\.[^/]*\.md$/i);

        const shouldInclude =
          isNotAdminFile &&
          isNotInGitHubDir &&
          isNotCodeOfConduct &&
          isNotLicense &&
          isNotChangelog &&
          isNotSecurity &&
          isNotContributing &&
          isNotPullRequestTemplate &&
          isNotIssueTemplate &&
          isNotWorkflow &&
          isNotReleaseNotes &&
          isNotAuthors &&
          isNotRoadmap &&
          isNotTodo &&
          isNotInstallation &&
          isNotGettingStarted &&
          isNotInUnderscoreDir &&
          isNotAtSymbolFile &&
          isNotInUnderscoreFile &&
          isNotIndexFile &&
          isNotPrefaceFile &&
          isNotProjectFile;

        // Debug logging for troubleshooting
        if (isMarkdown && isInSubdir) {
          if (!shouldInclude) {
            console.log(
              `Excluding file: ${filePath} (admin: ${!isNotAdminFile}, github: ${!isNotInGitHubDir}, codeOfConduct: ${!isNotCodeOfConduct}, license: ${!isNotLicense}, changelog: ${!isNotChangelog}, security: ${!isNotSecurity}, contributing: ${!isNotContributing}, prTemplate: ${!isNotPullRequestTemplate}, issueTemplate: ${!isNotIssueTemplate}, workflow: ${!isNotWorkflow}, releaseNotes: ${!isNotReleaseNotes}, authors: ${!isNotAuthors}, roadmap: ${!isNotRoadmap}, todo: ${!isNotTodo}, installation: ${!isNotInstallation}, gettingStarted: ${!isNotGettingStarted}, underscoreDir: ${!isNotInUnderscoreDir}, atSymbol: ${!isNotAtSymbolFile}, underscoreFile: ${!isNotInUnderscoreFile}, index: ${!isNotIndexFile}, preface: ${!isNotPrefaceFile}, project: ${!isNotProjectFile})`,
            );
          } else {
            console.log(`INCLUDING file: ${filePath}`);
          }
        }

        return shouldInclude;
      });

      // Clear existing cheatsheets for this repository
      await this.deleteRepositoryCheatsheets(repo.id);

      console.log(`Repository subdirectory setting: '${repo.subdirectory || "none"}'`);
      console.log(`Total files from GitHub API: ${files.length}`);
      console.log(
        `Found ${markdownFiles.length} markdown files to process for ${repo.owner}/${repo.name}${repo.subdirectory ? ` in subdirectory '${repo.subdirectory}'` : ""}`,
      );
      if (markdownFiles.length > 0) {
        console.log(
          "Files to process:",
          markdownFiles
            .map((f) => f.path)
            .slice(0, 10)
            .join(", "),
        );
        if (markdownFiles.length > 10) {
          console.log(`... and ${markdownFiles.length - 10} more files`);
        }
      } else {
        console.log("NO FILES TO PROCESS - This is the problem!");
      }

      let success = 0;
      let failed = 0;

      // Fetch content for each markdown file
      for (const file of markdownFiles) {
        try {
          const filePath = file.path as string;
          const contentUrl = `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${repo.defaultBranch}/${filePath}`;
          const contentResponse = await axios
            .get(contentUrl, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "text/plain",
                "User-Agent": "Cheatsheets-Remastered-Raycast",
              },
              timeout: 10000,
            })
            .catch((error) => {
              // Handle content fetching errors
              if (error.response?.status === 404) {
                throw new Error(`File not found: ${filePath}`);
              } else if (error.response?.status === 403) {
                throw new Error(`Access denied to file: ${filePath}`);
              } else if (error.code === "ETIMEDOUT") {
                throw new Error(`Timeout fetching file: ${filePath}`);
              }
              throw error;
            });

          const content = contentResponse.data;
          const slug = filePath.replace(".md", "");
          const title = this.extractTitleFromContent(content) || this.generateTitleFromSlug(slug);

          const cheatsheet: RepositoryCheatsheet = {
            id: `repo-${repo.id}-${slug}-${Date.now()}`,
            repositoryId: repo.id,
            slug,
            title,
            content,
            filePath: filePath,
            syncedAt: Date.now(),
          };

          await this.saveRepositoryCheatsheet(cheatsheet);
          success++;
        } catch (error) {
          console.warn(`Failed to fetch content for ${(file as Record<string, unknown>).path}:`, error);
          failed++;
        }
      }

      // Update repository with sync timestamp
      const repos = await this.getUserRepositories();
      const repoIndex = repos.findIndex((r) => r.id === repo.id);
      if (repoIndex !== -1) {
        repos[repoIndex].lastSyncedAt = Date.now();
        await LocalStorage.setItem("user-repositories", JSON.stringify(repos));
      }

      showToast({
        style: Toast.Style.Success,
        title: "Sync Complete",
        message: `Synced ${success} cheatsheets from ${repo.owner}/${repo.name}${repo.subdirectory ? ` (${repo.subdirectory}/)` : ""}${failed > 0 ? ` (${failed} failed)` : ""}`,
      });

      return { success, failed };
    } catch (error) {
      console.error("Failed to sync repository files:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Sync Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // Helper method to extract title from markdown content
  private static extractTitleFromContent(content: string): string | null {
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return trimmed.substring(2).trim();
      }
    }
    return null;
  }

  // Helper method to generate title from slug
  private static generateTitleFromSlug(slug: string): string {
    return slug
      .split("/")
      .pop()!
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Test function to validate exclusion filters against sample repository patterns
  static testExclusionFilters(): void {
    const testFiles = [
      // Valid cheatsheets (should pass)
      { path: "cheatsheets/git.md", type: "blob" },
      { path: "docs/javascript.md", type: "blob" },
      { path: "guides/react.md", type: "blob" },
      { path: "tutorials/python.md", type: "blob" },
      { path: "cheatsheets/AJAX_Security_Cheat_Sheet.md", type: "blob" },
      { path: "cheatsheets/Abuse_Case_Cheat_Sheet.md", type: "blob" },

      // Invalid files (should be excluded)
      { path: "README.md", type: "blob" },
      { path: "LICENSE.md", type: "blob" },
      { path: "CONTRIBUTING.md", type: "blob" },
      { path: ".github/README.md", type: "blob" },
      { path: "_includes/header.md", type: "blob" },
      { path: "_layouts/main.md", type: "blob" },
      { path: "file@2023.md", type: "blob" },
      { path: "index@2016.md", type: "blob" },
      { path: "_private.md", type: "blob" },
      { path: "docs/_internal.md", type: "blob" },
      { path: "CHANGELOG.md", type: "blob" },
      { path: "SECURITY.md", type: "blob" },
      { path: "AUTHORS.md", type: "blob" },
      { path: "ROADMAP.md", type: "blob" },
      { path: "TODO.md", type: "blob" },
      { path: "INSTALL.md", type: "blob" },
      { path: "GETTING_STARTED.md", type: "blob" },
      { path: ".github/workflows/ci.md", type: "blob" },
      { path: ".github/ISSUE_TEMPLATE/bug.md", type: "blob" },
      { path: "pull_request_template.md", type: "blob" },
      { path: "RELEASE_NOTES.md", type: "blob" },
      { path: "CONTRIBUTORS.md", type: "blob" },
      { path: "TASKS.md", type: "blob" },
      { path: "INSTALLATION.md", type: "blob" },
      { path: "QUICK_START.md", type: "blob" },
      { path: "Index.md", type: "blob" },
      { path: "IndexASVS.md", type: "blob" },
      { path: "Preface.md", type: "blob" },
      { path: "HelpGuide.md", type: "blob" },
      { path: "Project.code-workspace.md", type: "blob" },

      // Non-markdown files (should be excluded)
      { path: "script.js", type: "blob" },
      { path: "style.css", type: "blob" },
      { path: "package.json", type: "blob" },
      { path: "config.yaml", type: "blob" },
    ];

    const mockRepo = {
      id: "test-repo",
      name: "test-repo",
      owner: "test-owner",
      defaultBranch: "main",
      subdirectory: undefined,
    };

    // Apply the same filtering logic as in syncRepositoryFiles
    const filteredFiles = testFiles.filter((file: Record<string, unknown>) => {
      const filePath = file.path as string;
      const isMarkdown = filePath.endsWith(".md");
      const isInSubdir = !mockRepo.subdirectory || filePath.startsWith(mockRepo.subdirectory + "/");

      // Skip if not markdown or not in subdirectory
      if (!isMarkdown || !isInSubdir) {
        return false;
      }

      // Admin and documentation file exclusions - be more precise
      const isNotAdminFile = !filePath.match(/^(README|CONTRIBUTING|index|index@2016)\.md$/i);
      const isNotInGitHubDir = !filePath.startsWith(".github/");
      const isNotCodeOfConduct = !filePath.match(/code[_-]of[_-]conduct\.md$/i);
      const isNotLicense = !filePath.match(/^(LICENSE|LICENCE)\.md$/i);
      const isNotChangelog = !filePath.match(/^(CHANGELOG|HISTORY)\.md$/i);
      const isNotSecurity = !filePath.match(/^(SECURITY|SECURITY\.md)$/i);
      const isNotContributing = !filePath.match(/^(CONTRIBUTING|CONTRIBUTING\.md)$/i);
      const isNotPullRequestTemplate = !filePath.match(/pull_request_template\.md$/i);
      const isNotIssueTemplate = !filePath.startsWith(".github/ISSUE_TEMPLATE/");
      const isNotWorkflow = !filePath.startsWith(".github/workflows/");
      const isNotReleaseNotes = !filePath.match(/^(RELEASES?|RELEASE[_-]NOTES?)\.md$/i);
      const isNotAuthors = !filePath.match(/^(AUTHORS?|CONTRIBUTORS?)\.md$/i);
      const isNotRoadmap = !filePath.match(/^(ROADMAP|ROAD[_-]MAP)\.md$/i);
      const isNotTodo = !filePath.match(/^(TODO|TASKS?)\.md$/i);
      const isNotInstallation = !filePath.match(/^(INSTALL|INSTALLATION)\.md$/i);
      const isNotGettingStarted = !filePath.match(/^(GETTING[_-]STARTED|QUICK[_-]START)\.md$/i);

      // Directory and file pattern exclusions
      const isNotInUnderscoreDir = !filePath.match(/(^|\/)_[^/]+/);
      const isNotAtSymbolFile = !filePath.includes("@");
      const isNotInUnderscoreFile = !filePath.match(/_[^/]*\.md$/);

      // Additional exclusions for common non-cheatsheet files
      const isNotIndexFile = !filePath.match(/^(Index|IndexASVS|IndexMASVS|IndexProactiveControls|IndexTopTen)\.md$/i);
      const isNotPrefaceFile = !filePath.match(/^(Preface|HelpGuide)\.md$/i);
      const isNotProjectFile = !filePath.match(/^Project\.[^/]*\.md$/i);

      return (
        isNotAdminFile &&
        isNotInGitHubDir &&
        isNotCodeOfConduct &&
        isNotLicense &&
        isNotChangelog &&
        isNotSecurity &&
        isNotContributing &&
        isNotPullRequestTemplate &&
        isNotIssueTemplate &&
        isNotWorkflow &&
        isNotReleaseNotes &&
        isNotAuthors &&
        isNotRoadmap &&
        isNotTodo &&
        isNotInstallation &&
        isNotGettingStarted &&
        isNotInUnderscoreDir &&
        isNotAtSymbolFile &&
        isNotInUnderscoreFile &&
        isNotIndexFile &&
        isNotPrefaceFile &&
        isNotProjectFile
      );
    });

    console.log("Exclusion Filter Test Results:");
    console.log(`Total test files: ${testFiles.length}`);
    console.log(`Filtered files: ${filteredFiles.length}`);
    console.log("Valid cheatsheets that passed:");
    filteredFiles.forEach((file) => console.log(`  ✅ ${file.path as string}`));

    const expectedValid = [
      "cheatsheets/git.md",
      "docs/javascript.md",
      "guides/react.md",
      "tutorials/python.md",
      "cheatsheets/AJAX_Security_Cheat_Sheet.md",
      "cheatsheets/Abuse_Case_Cheat_Sheet.md",
    ];
    const actualValid = filteredFiles.map((f) => f.path as string);

    console.log("\nValidation:");
    expectedValid.forEach((expected) => {
      const found = actualValid.includes(expected);
      console.log(`${found ? "✅" : "❌"} ${expected} - ${found ? "PASS" : "FAIL"}`);
    });

    const unexpectedFiles = actualValid.filter((f) => !expectedValid.includes(f));
    if (unexpectedFiles.length > 0) {
      console.log("\nUnexpected files that passed:");
      unexpectedFiles.forEach((file) => console.log(`  ⚠️  ${file}`));
    }
  }

  static async getUserRepository(id: string): Promise<UserRepository | null> {
    try {
      const repos = await this.getUserRepositories();
      return repos.find((repo) => repo.id === id) || null;
    } catch (error) {
      console.error("Failed to get repository:", error);
      return null;
    }
  }

  static async recordRepositoryAccess(id: string): Promise<void> {
    try {
      const repos = await this.getUserRepositories();
      const index = repos.findIndex((repo) => repo.id === id);

      if (index !== -1) {
        repos[index].lastAccessedAt = Date.now();
        await LocalStorage.setItem("user-repositories", JSON.stringify(repos));
      }
    } catch (error) {
      console.warn("Failed to record repository access:", error);
    }
  }

  static async searchUserRepositories(query: string): Promise<UserRepository[]> {
    try {
      const repos = await this.getUserRepositories();
      const lowerQuery = query.toLowerCase();

      return repos.filter(
        (repo) =>
          repo.name.toLowerCase().includes(lowerQuery) ||
          repo.owner.toLowerCase().includes(lowerQuery) ||
          repo.description?.toLowerCase().includes(lowerQuery),
      );
    } catch (error) {
      console.error("Failed to search repositories:", error);
      return [];
    }
  }

  // Repository cheatsheet management methods
  static async getRepositoryCheatsheets(repositoryId?: string): Promise<RepositoryCheatsheet[]> {
    try {
      const cheatsheetsJson = await LocalStorage.getItem<string>("repository-cheatsheets");
      const cheatsheets = cheatsheetsJson ? JSON.parse(cheatsheetsJson) : [];

      if (repositoryId) {
        return cheatsheets.filter((sheet: RepositoryCheatsheet) => sheet.repositoryId === repositoryId);
      }

      return cheatsheets;
    } catch (error) {
      console.warn("Failed to load repository cheatsheets:", error);
      return [];
    }
  }

  static async saveRepositoryCheatsheet(cheatsheet: RepositoryCheatsheet): Promise<void> {
    try {
      const cheatsheets = await this.getRepositoryCheatsheets();
      const existingIndex = cheatsheets.findIndex((sheet) => sheet.id === cheatsheet.id);

      if (existingIndex >= 0) {
        cheatsheets[existingIndex] = cheatsheet;
      } else {
        cheatsheets.push(cheatsheet);
      }

      await LocalStorage.setItem("repository-cheatsheets", JSON.stringify(cheatsheets));
    } catch (error) {
      console.error("Failed to save repository cheatsheet:", error);
      throw error;
    }
  }

  static async deleteRepositoryCheatsheets(repositoryId: string): Promise<void> {
    try {
      const cheatsheets = await this.getRepositoryCheatsheets();
      const filtered = cheatsheets.filter((sheet: RepositoryCheatsheet) => sheet.repositoryId !== repositoryId);
      await LocalStorage.setItem("repository-cheatsheets", JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to delete repository cheatsheets:", error);
      throw error;
    }
  }

  static async getRepositoryCheatsheet(id: string): Promise<RepositoryCheatsheet | null> {
    try {
      const cheatsheets = await this.getRepositoryCheatsheets();
      return cheatsheets.find((sheet: RepositoryCheatsheet) => sheet.id === id) || null;
    } catch (error) {
      console.error("Failed to get repository cheatsheet:", error);
      return null;
    }
  }

  static async recordRepositoryCheatsheetAccess(id: string): Promise<void> {
    try {
      const cheatsheet = await this.getRepositoryCheatsheet(id);
      if (cheatsheet) {
        cheatsheet.lastAccessedAt = Date.now();
        await this.saveRepositoryCheatsheet(cheatsheet);
      }
    } catch (error) {
      console.warn("Failed to record repository cheatsheet access:", error);
    }
  }
}

// Helper function to get sheets from files
function getSheets(files: File[]): string[] {
  return files
    .filter((file) => {
      const isDir = file.type === "tree";
      const isMarkdown = file.path.endsWith(".md");
      const adminFiles = ["CONTRIBUTING", "README", "index", "index@2016"];
      const isAdminFile = adminFiles.some((adminFile) => file.path.startsWith(adminFile));
      // Exclude Jekyll/include dirs like _includes, _layouts, etc.
      const inUnderscoreDir = /(^|\/)_[^/]+/.test(file.path);
      return !isDir && isMarkdown && !isAdminFile && !inUnderscoreDir;
    })
    .map((file) => file.path.replace(".md", ""));
}

export default Service;
export type {
  File,
  CustomCheatsheet,
  Preferences,
  OfflineCheatsheet,
  FavoriteCheatsheet,
  UserRepository,
  RepositoryCheatsheet,
};
