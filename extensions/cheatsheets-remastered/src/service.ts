import { showToast, Toast, environment } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DEFAULT_SHEET_METADATA, DefaultMetadata } from "./default-tags";
import type { File, CustomCheatsheet, UserRepository, SheetType, RepositorySheet } from "./models";
import { repositoryMetadata } from "./markdown";
import { libraryStore } from "./library-store";
import { stateKey } from "./identity";
import type { LocalMarkdown } from "./local-markdown";
import { stageRepository, normaliseSubdirectory, SyncCancelledError } from "./repository-sync";

class AlreadyImported extends Error {
  constructor(readonly sheet: CustomCheatsheet) {
    super("Already imported");
  }
}

class Service {
  private static LOCAL_SHEETS_DIR = path.join(environment.assetsPath, "cheatsheets");
  static async listFiles(): Promise<File[]> {
    return this.listLocalCheatsheets();
  }
  static async getSheet(slug: string): Promise<string> {
    const content = this.readLocalCheatsheet(slug);
    if (content === null)
      throw new Error("Bundled cheatsheet unavailable. Reinstall the extension after backing up personal data.");
    return content;
  }
  static async searchDefaultContent(query: string): Promise<string[]> {
    return this.searchLocalContent(query);
  }
  static urlFor(slug: string) {
    return `https://devhints.io/${slug.split("/").map(encodeURIComponent).join("/")}`;
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

  // ---------- Local bundled cheatsheets ----------
  private static listLocalCheatsheets(): File[] {
    try {
      if (!fs.existsSync(this.LOCAL_SHEETS_DIR)) throw new Error("Missing bundled directory");
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
    } catch {
      throw new Error("Bundled cheatsheets unavailable. Reinstall after backing up personal data.");
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
    const q = (query || "").trim();
    if (q.length < 3) return [];
    const files = this.listLocalCheatsheets();
    const results: string[] = [];
    for (const f of files) {
      const slug = f.path.replace(/\.md$/i, "");
      const content = this.readLocalCheatsheet(slug);
      if (content === null)
        throw new Error("Bundled cheatsheets unavailable. Reinstall after backing up personal data.");
      if (content.toLowerCase().includes(q.toLowerCase())) results.push(slug);
    }
    return Array.from(new Set(results));
  }

  static async getCustomCheatsheets() {
    return (await libraryStore.read()).custom;
  }
  static async createCustomCheatsheet(
    title: string,
    content: string,
    tags?: string[],
    description?: string,
  ): Promise<CustomCheatsheet> {
    if (!title.trim() || !content.trim()) throw new Error("Title and content are required");
    return libraryStore.update((data) => {
      const sheet = {
        id: `custom-${randomUUID()}`,
        title: title.trim(),
        content,
        tags,
        description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      data.custom.push(sheet);
      return sheet;
    });
  }
  static async importCustomCheatsheet(
    input: LocalMarkdown,
    signal?: AbortSignal,
  ): Promise<{ status: "created" | "duplicate"; sheet: CustomCheatsheet }> {
    signal?.throwIfAborted();
    if (!input.title.trim() || !input.content.trim()) throw new Error("Title and content are required");
    try {
      const sheet = await libraryStore.update((data) => {
        signal?.throwIfAborted();
        const existing = data.custom.find((sheet) => sheet.content === input.content);
        // Throw before backup/write, while still holding the existing storage lock.
        if (existing) throw new AlreadyImported(existing);
        const now = Date.now();
        const sheet: CustomCheatsheet = {
          id: `custom-${randomUUID()}`,
          title: input.title.trim(),
          content: input.content,
          tags: input.tags,
          description: input.description,
          createdAt: now,
          updatedAt: now,
        };
        data.custom.push(sheet);
        return sheet;
      }, signal);
      return { status: "created", sheet };
    } catch (error) {
      if (error instanceof AlreadyImported) return { status: "duplicate", sheet: error.sheet };
      throw error;
    }
  }
  static async updateCustomCheatsheet(
    id: string,
    title: string,
    content: string,
    tags?: string[],
    description?: string,
    expectedUpdatedAt?: number,
  ) {
    if (!title.trim() || !content.trim()) throw new Error("Title and content are required");
    return libraryStore.update((data) => {
      const sheet = data.custom.find((s) => s.id === id);
      if (!sheet) throw new Error("This cheatsheet was removed. Copy your draft before closing.");
      if (expectedUpdatedAt !== undefined && sheet.updatedAt !== expectedUpdatedAt)
        throw new Error("This cheatsheet changed in another command. Copy your draft, then reopen the editor.");
      Object.assign(sheet, {
        title: title.trim(),
        content,
        tags,
        description,
        updatedAt: Math.max(Date.now(), sheet.updatedAt + 1),
      });
      return sheet;
    });
  }
  static async deleteCustomCheatsheet(id: string) {
    return libraryStore.update((data) => {
      const before = data.custom.length;
      data.custom = data.custom.filter((s) => s.id !== id);
      data.favorites = data.favorites.filter((s) => s.type !== "custom" || s.slug !== id);
      data.hidden = data.hidden.filter((s) => s.type !== "custom" || s.slug !== id);
      data.views = data.views.filter((s) => s.type !== "custom" || s.slug !== id);
      return before !== data.custom.length;
    });
  }
  static async getFavorites() {
    return (await libraryStore.read()).favorites;
  }
  static async addToFavorites(type: SheetType, slug: string, title: string) {
    await libraryStore.update((data) => {
      if (!data.favorites.some((f) => f.type === type && f.slug === slug))
        data.favorites.push({ id: stateKey(type, slug), type, slug, title, favoritedAt: Date.now() });
    });
  }
  static async toggleFavorite(type: SheetType, slug: string, title: string) {
    return libraryStore.update((data) => {
      const exists = data.favorites.some((f) => f.type === type && f.slug === slug);
      data.favorites = data.favorites.filter((f) => f.type !== type || f.slug !== slug);
      if (!exists) data.favorites.push({ id: stateKey(type, slug), type, slug, title, favoritedAt: Date.now() });
      return !exists;
    });
  }
  static async getHiddenCheatsheets() {
    return (await libraryStore.read()).hidden;
  }
  static async toggleHidden(type: SheetType, slug: string, title: string) {
    return libraryStore.update((data) => {
      const key = stateKey(type, slug);
      const exists = data.hidden.some((h) => h.key === key);
      data.hidden = data.hidden.filter((h) => h.key !== key);
      if (!exists) data.hidden.push({ key, type, slug, title, hiddenAt: Date.now() });
      return !exists;
    });
  }
  static async getViewStatsMap() {
    return Object.fromEntries(
      (await libraryStore.read()).views.map((v) => [v.key, { count: v.count, lastViewedAt: v.lastViewedAt }]),
    );
  }
  static async recordView(type: SheetType, slug: string, title: string) {
    await libraryStore.update((data) => {
      const key = stateKey(type, slug);
      const view = data.views.find((v) => v.key === key);
      const now = Date.now();
      if (view) {
        view.count++;
        view.lastViewedAt = now;
        view.title = title;
      } else data.views.push({ key, type, slug, title, count: 1, lastViewedAt: now });
      if (type === "repository") {
        const sheet = data.sheets.find((s) => s.id === slug);
        if (sheet) sheet.lastAccessedAt = now;
      }
    });
  }
  static validateGitHubRepository(owner: string, repo: string) {
    const isValid =
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(owner.trim()) &&
      /^[a-zA-Z0-9._-]+$/.test(repo.trim()) &&
      ![".", ".."].includes(repo.trim());
    return { isValid, error: isValid ? undefined : "Enter a valid GitHub owner and repository name (not a URL)." };
  }
  static async getUserRepositories() {
    return (await libraryStore.read()).repositories;
  }
  static async getUserRepository(id: string) {
    return (await this.getUserRepositories()).find((r) => r.id === id) ?? null;
  }
  static async addUserRepository(
    name: string,
    owner: string,
    description?: string,
    url?: string,
    isPrivate = false,
    defaultBranch = "main",
    subdirectory?: string,
  ): Promise<UserRepository> {
    const validation = this.validateGitHubRepository(owner, name);
    if (!validation.isValid) throw new Error(validation.error);
    return libraryStore.update((data) => {
      if (
        data.repositories.some(
          (r) =>
            r.owner.toLowerCase() === owner.trim().toLowerCase() && r.name.toLowerCase() === name.trim().toLowerCase(),
        )
      )
        throw new Error("Repository already exists in your list");
      const repo = {
        id: `repo-${randomUUID()}`,
        name: name.trim(),
        owner: owner.trim(),
        description,
        url: this.repositoryUrl(owner, name, url),
        isPrivate,
        defaultBranch: defaultBranch.trim() || "main",
        subdirectory: normaliseSubdirectory(subdirectory),
        addedAt: Date.now(),
      };
      data.repositories.push(repo);
      return repo;
    });
  }
  private static repositoryUrl(owner: string, name: string, supplied?: string) {
    const canonical = `https://github.com/${owner.trim()}/${name.trim()}`;
    if (supplied && supplied.replace(/\/$/, "").toLowerCase() !== canonical.toLowerCase())
      throw new Error("Repository URL must match https://github.com/owner/name.");
    return canonical;
  }
  static async updateUserRepository(
    id: string,
    updates: Partial<Pick<UserRepository, "name" | "owner" | "description" | "url" | "defaultBranch" | "subdirectory">>,
    expected?: UserRepository,
  ) {
    return libraryStore.update((data) => {
      const repo = data.repositories.find((r) => r.id === id);
      if (!repo) throw new Error("Repository was removed. Refresh and retry.");
      const fields = ["name", "owner", "description", "url", "defaultBranch", "subdirectory"] as const;
      if (expected && fields.some((field) => repo[field] !== expected[field]))
        throw new Error("Repository settings changed in another command. Copy your changes, then reopen the editor.");
      const next = { ...repo, ...updates };
      const validation = this.validateGitHubRepository(next.owner, next.name);
      if (!validation.isValid || !next.defaultBranch.trim()) throw new Error(validation.error || "Branch is required");
      if (
        data.repositories.some(
          (r) =>
            r.id !== id &&
            r.owner.toLowerCase() === next.owner.toLowerCase() &&
            r.name.toLowerCase() === next.name.toLowerCase(),
        )
      )
        throw new Error("Repository already exists in your list");
      // Do not silently relabel cached content as belonging to another repository/branch.
      if (
        next.owner.toLowerCase() !== repo.owner.toLowerCase() ||
        next.name.toLowerCase() !== repo.name.toLowerCase() ||
        next.defaultBranch !== repo.defaultBranch
      )
        throw new Error(
          "To change owner, repository or branch, remove this entry and add it again. Existing favorites and history are retained.",
        );
      next.url = this.repositoryUrl(next.owner, next.name, updates.url);
      next.subdirectory = normaliseSubdirectory(next.subdirectory);
      Object.assign(repo, next);
      return repo;
    });
  }
  static async removeUserRepository(id: string) {
    return libraryStore.update((data) => {
      data.repositories = data.repositories.filter((r) => r.id !== id);
      data.sheets = data.sheets.filter((s) => s.repositoryId !== id);
      // Keep state identities so re-adding the same repository/branch restores them.
    });
  }
  static async recordRepositoryAccess(id: string) {
    await libraryStore.update((data) => {
      const repo = data.repositories.find((r) => r.id === id);
      if (repo) repo.lastAccessedAt = Date.now();
    });
  }
  static async getRepositoryCheatsheets(repositoryId?: string): Promise<RepositorySheet[]> {
    const data = await libraryStore.read();
    return data.sheets
      .filter(
        (s) =>
          (!repositoryId || s.repositoryId === repositoryId) && data.repositories.some((r) => r.id === s.repositoryId),
      )
      .map((sheet) => {
        const metadata = repositoryMetadata(sheet.content);
        return {
          ...sheet,
          title: metadata.title ?? sheet.title,
          tags: metadata.tags,
          description: metadata.description,
        };
      });
  }
  static async getMigrationWarnings() {
    return (await libraryStore.read()).unresolvedLegacyKeys;
  }
  private static syncing = new Set<string>();
  static async syncRepositoryFiles(
    repo: UserRepository,
    token?: string,
    signal?: AbortSignal,
  ): Promise<{ success: number; failed: number }> {
    if (this.syncing.has(repo.id)) throw new Error("This repository is already syncing.");
    this.syncing.add(repo.id);
    const controller = new AbortController();
    const combined = AbortSignal.any([controller.signal, ...(signal ? [signal] : [])]);
    let toast: Toast | undefined;
    let committing = false;
    try {
      toast = await showToast({
        style: Toast.Style.Animated,
        title: "Syncing Repository",
        message: "Staging a complete snapshot; saved content remains available.",
        primaryAction: { title: "Cancel Sync", onAction: () => controller.abort() },
      });
      const start = await this.getUserRepository(repo.id);
      if (!start) throw new Error("Repository was removed. Refresh and retry.");
      const staged = await stageRepository(start, token, combined);
      committing = true;
      await libraryStore.update((data) => {
        combined.throwIfAborted();
        const current = data.repositories.find((r) => r.id === start.id);
        if (
          !current ||
          current.defaultBranch !== start.defaultBranch ||
          current.owner !== start.owner ||
          current.name !== start.name ||
          current.subdirectory !== start.subdirectory ||
          current.lastSyncedAt !== start.lastSyncedAt
        )
          throw new Error("Repository changed during sync. Previous snapshot retained; refresh and retry.");
        const previous = new Map(data.sheets.map((s) => [s.id, s]));
        data.sheets = [
          ...data.sheets.filter((s) => s.repositoryId !== start.id),
          ...staged.sheets.map((s) => ({ ...s, lastAccessedAt: previous.get(s.id)?.lastAccessedAt })),
        ];
        current.lastSyncedAt = staged.syncedAt;
        current.revision = staged.revision;
      }, combined);
      toast.style = Toast.Style.Success;
      toast.title = "Repository Synced";
      toast.message = `${staged.sheets.length} cheatsheets saved`;
      toast.primaryAction = undefined;
      return { success: staged.sheets.length, failed: 0 };
    } catch (error) {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = combined.aborted ? "Sync Canceled" : "Sync Failed";
        toast.message = committing
          ? "Check saved content before retrying. The previous valid library is backed up before commit."
          : "Previous snapshot retained. Retry after resolving the error.";
        toast.primaryAction = undefined;
      }
      throw combined.aborted ? new SyncCancelledError() : error;
    } finally {
      this.syncing.delete(repo.id);
    }
  }
}
export default Service;
export type {
  File,
  CustomCheatsheet,
  FavoriteCheatsheet,
  UserRepository,
  RepositoryCheatsheet,
  RepositorySheet,
} from "./models";
