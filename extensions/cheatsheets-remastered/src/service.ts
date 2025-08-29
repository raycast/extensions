import axios from "axios";
import { LocalStorage, showToast, Toast, getPreferenceValues, Icon, Image, Color, environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import { DEFAULT_SHEET_METADATA, DefaultMetadata } from "./default-tags";

interface ExtendedPreferences extends Preferences {
  githubToken?: string;
  iconSource?: "raycast" | "custom";
  customIconDirectory?: string;
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
  type: "custom" | "default";
  slug: string;
  title: string;
  favoritedAt: number;
}

interface ViewRecord {
  key: string; // `${type}:${slug}`
  type: "custom" | "default";
  slug: string;
  title: string;
  count: number;
  lastViewedAt: number;
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
  iconKey?: string; // Raycast Icon key
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
  iconKey?: string;
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

  // Pick an icon for a default cheatsheet based on metadata iconKey or slug heuristics
  static getDefaultIconKey(slug: string): string {
    const md = this.getDefaultMetadata(slug);
    if (md?.iconKey) return md.iconKey;
    const key = slug.toLowerCase();
    if (/((^|[-_/])js($|[-_/])|typescript|ts|react|vue|angular|svelte|graphql)/.test(key)) return "Code";
    if (/(python|bash|zsh|fish|linux|shell|vim|tmux|sed|awk|grep|curl|ssh)/.test(key)) return "Terminal";
    if (/(docker|kubernetes|git|github|box)/.test(key)) return "Box";
    if (/(sql|postgres|mysql|sqlite|redis|mongo)/.test(key)) return "Document";
    if (/(aws|cloud|terraform)/.test(key)) return "Cloud";
    if (/(http|nginx)/.test(key)) return "Globe";
    return "Document";
  }

  static iconForKey(key?: string): Icon {
    switch ((key || "").toLowerCase()) {
      case "code":
        return Icon.Code;
      case "terminal":
        return Icon.Terminal;
      case "document":
        return Icon.Document;
      case "cloud":
        return Icon.Cloud;
      case "globe":
        return Icon.Globe;
      case "box":
        return Icon.Box;
      case "gear":
        return Icon.Gear;
      case "window":
        return Icon.Window;
      case "keyboard":
        return Icon.Keyboard;
      case "link":
        return Icon.Link;
      case "star":
        return Icon.Star;
      case "stardisabled":
      case "star_disabled":
        return Icon.StarDisabled;
      default:
        return Icon.Document;
    }
  }

  // Resolve icon for a slug or key considering preferences and bundled media
  static resolveIconForSlug(slugOrKey: string): Image.ImageLike {
    const prefs = this.getPreferences() as ExtendedPreferences;
    const base = (slugOrKey.split("/").pop() || slugOrKey).toLowerCase();
    const aliasBase = this.alias(base);
    const isTerminal = this.isTerminalTool(base);
    // Build candidate names from slug tokens + aliases, then base/alias, and finally terminal fallback
    const tokenSet = new Set<string>();
    for (const t of this.tokenize(slugOrKey)) {
      if (t) tokenSet.add(t);
      const a = this.alias(t);
      if (a) tokenSet.add(a);
    }
    const tokenCandidates = Array.from(tokenSet);
    const baseCandidates = [base, aliasBase].filter(Boolean);
    const candidates = isTerminal
      ? [...tokenCandidates, ...baseCandidates, "terminal"]
      : [...tokenCandidates, ...baseCandidates];
    if (prefs.iconSource === "raycast") {
      return this.iconForKey(this.getDefaultIconKey(aliasBase));
    }
    if (prefs.iconSource === "custom" && prefs.customIconDirectory) {
      for (const c of candidates) {
        const png = path.join(prefs.customIconDirectory, `${c}.png`);
        if (fs.existsSync(png)) return { source: png, tintColor: Color.PrimaryText };
        const svg = path.join(prefs.customIconDirectory, `${c}.svg`);
        if (fs.existsSync(svg)) return { source: svg, tintColor: Color.PrimaryText };
      }
    }
    // Built-in media fallback
    for (const c of candidates) {
      const pPng = path.join(environment.assetsPath, `${c}.png`);
      const pSvg = path.join(environment.assetsPath, `${c}.svg`);
      if (fs.existsSync(pPng)) return { source: pPng, tintColor: Color.PrimaryText };
      if (fs.existsSync(pSvg)) return { source: pSvg, tintColor: Color.PrimaryText };
    }
    // Finally, Raycast icon from metadata
    return this.iconForKey(this.getDefaultIconKey(aliasBase));
  }

  private static alias(name: string): string {
    if (name === "js" || name === "javascript") return "javascript";
    if (name === "ts" || name === "typescript") return "typescript";
    if (name === "nodejs" || name === "node") return "node";
    if (name === "psql" || name === "postgresql") return "postgres";
    if (name === "k8s" || name === "kubernetes") return "kubernetes";
    if (name === "css" || name.startsWith("css-")) return "css";
    if (name === "git" || name.startsWith("git-")) return "git";
    if (name === "gh" || name.startsWith("gh-") || name === "github" || name.startsWith("github-")) return "github";
    if (name === "angularjs" || name.startsWith("angularjs-")) return "angular";
    return name;
  }

  private static isTerminalTool(name: string): boolean {
    const key = name.toLowerCase();
    return /(bash|zsh|fish|shell|^sh$|tmux|vim|emacs|sed|awk|grep|curl|ssh|npm|yarn|pnpm|nvm|brew|jq|make|^101$)/.test(
      key,
    );
  }

  private static tokenize(name: string): string[] {
    const raw = (name || "").toLowerCase();
    const tokens = raw.split(/[\s/_.-]+/).filter(Boolean);
    // Filter out plain 'js' unless it's explicitly bounded by separators (handled in getDefaultIconKey)
    return tokens.filter((t) => t !== "js");
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

  static async recordView(type: "custom" | "default", slug: string, title: string): Promise<void> {
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
    iconKey?: string,
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
        iconKey: iconKey?.trim() || undefined,
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
    iconKey?: string,
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
        iconKey: iconKey?.trim() || customSheets[index].iconKey,
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
        iconKey: sheet.iconKey,
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

  static async addToFavorites(type: "custom" | "default", slug: string, title: string): Promise<void> {
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

  static async removeFromFavorites(type: "custom" | "default", slug: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filtered = favorites.filter((fav) => !(fav.slug === slug && fav.type === type));
      await LocalStorage.setItem("favorite-cheatsheets", JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to remove from favorites:", error);
      throw error;
    }
  }

  static async isFavorited(type: "custom" | "default", slug: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some((fav) => fav.slug === slug && fav.type === type);
    } catch (error) {
      console.error("Failed to check favorite status:", error);
      return false;
    }
  }

  static async toggleFavorite(type: "custom" | "default", slug: string, title: string): Promise<boolean> {
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
export type { File, CustomCheatsheet, Preferences, OfflineCheatsheet, FavoriteCheatsheet };
