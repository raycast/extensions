import type {
  LaunchEntry,
  LayoutEntry,
  QuickShellSettings,
  StoredData,
  StoredWorkspace,
  Workspace,
  WorkspaceSecurityMetadata,
} from "./schema";
import { STORAGE_KEY, createEmptyStoredData } from "./schema";
import { createStableId, ensureStableId } from "./ids";
import {
  parseImportPayload,
  summarizeImportConflicts,
  type ImportConflictSummary,
  type ImportResult,
} from "./import-export";
import { migrateStoredData, synthesizeLayoutEntries } from "./migration";
import { getFavoriteWorkspaces } from "./ranking";
import { normalizeWorkspace, validateWorkspace, validateWorkspaceCount } from "./validation";
import {
  digest,
  coerceTrustedWhileDisabled,
  createIngressSecurity,
  matchesReviewToken,
  type WorkspaceReviewToken,
} from "./security";
import { isSafeGitBranchName } from "./git-launch-gate";

export type StorageAdapter = {
  getItem: (key: string) => Promise<string | undefined>;
  setItem: (key: string, value: string) => Promise<void>;
};

const MAX_HISTORY_ENTRIES = 25;
const RECENT_WRITE_DEBOUNCE_MS = 500;

export class QuickShellStorage {
  private cache: StoredData | null = null;
  private undoHistory: StoredData[] = [];
  private redoHistory: StoredData[] = [];
  private recentWriteTimer: ReturnType<typeof setTimeout> | null = null;
  private recentWriteDirty = false;

  constructor(
    private readonly adapter: StorageAdapter,
    private readonly settingsProvider?: () => QuickShellSettings,
  ) {}

  async load(): Promise<StoredData> {
    await this.ensureLoaded();
    return this.cloneData(this.cache!);
  }

  canUndo(): boolean {
    return this.undoHistory.length > 0;
  }

  canRedo(): boolean {
    return this.redoHistory.length > 0;
  }

  async undo(): Promise<boolean> {
    await this.flushRecentWrites();
    if (this.undoHistory.length === 0) {
      return false;
    }

    if (this.cache) {
      this.redoHistory.push(this.cloneData(this.cache));
    }

    const previous = this.undoHistory.pop();
    if (!previous) {
      return false;
    }

    this.cache = this.preserveCurrentTrust(this.cloneData(previous), this.cache);
    await this.persistCache({ recordHistory: false });
    return true;
  }

  async redo(): Promise<boolean> {
    await this.flushRecentWrites();
    if (this.redoHistory.length === 0) {
      return false;
    }

    if (this.cache) {
      this.undoHistory.push(this.cloneData(this.cache));
    }

    const next = this.redoHistory.pop();
    if (!next) {
      return false;
    }

    this.cache = this.preserveCurrentTrust(this.cloneData(next), this.cache);
    await this.persistCache({ recordHistory: false });
    return true;
  }

  async exportJson(): Promise<string> {
    const data = await this.load();
    const settings = await this.getSettings();
    const portable = { ...data };
    delete portable.workspaceSecurity;
    delete portable.branchTargets;
    return JSON.stringify({ ...portable, settings }, null, 2);
  }

  async importJson(raw: string, mode: "merge" | "replace" = "merge"): Promise<ImportResult> {
    await this.flushRecentWrites();
    const existing = mode === "merge" ? await this.load() : createEmptyStoredData();
    const result = parseImportPayload(raw, existing);
    await this.save(result.data, { preserveSecurity: false, allowSubmittedSecurity: true });
    return result;
  }

  async summarizeImport(raw: string, mode: "merge" | "replace" = "merge"): Promise<ImportConflictSummary> {
    const existing = mode === "merge" ? await this.load() : createEmptyStoredData();
    return summarizeImportConflicts(raw, existing);
  }

  async save(
    data: StoredData,
    options?: {
      recordHistory?: boolean;
      preserveSecurity?: boolean;
      allowSubmittedSecurity?: boolean;
    },
  ): Promise<void> {
    const recordHistory = options?.recordHistory ?? true;
    const preserveSecurity = options?.preserveSecurity ?? true;
    const allowSubmittedSecurity = options?.allowSubmittedSecurity ?? false;

    const normalized: StoredData = {
      version: data.version,
      settings: { ...data.settings },
      workspaces: data.workspaces.map((workspace) => normalizeWorkspace({ ...workspace })),
      workspaceSecurity: {},
      branchTargets: { ...(data.branchTargets ?? {}) },
      layoutEntries: syncLayoutEntries(data.layoutEntries, data.workspaces),
    };

    for (const workspace of normalized.workspaces) {
      const prior = this.cache?.workspaceSecurity?.[workspace.id];
      const submitted = data.workspaceSecurity?.[workspace.id];
      if (preserveSecurity && prior) {
        const previousWorkspace = this.cache?.workspaces.find((candidate) => candidate.id === workspace.id);
        const changed = JSON.stringify(previousWorkspace) !== JSON.stringify(workspace);
        normalized.workspaceSecurity![workspace.id] = {
          ...prior,
          revision: changed ? prior.revision + 1 : prior.revision,
        };
      } else if (allowSubmittedSecurity && submitted) {
        normalized.workspaceSecurity![workspace.id] = { ...submitted };
      } else {
        normalized.workspaceSecurity![workspace.id] = createIngressSecurity();
      }
    }

    const countResult = validateWorkspaceCount(normalized.workspaces.length);
    if (!countResult.ok) {
      throw new Error(countResult.message);
    }

    for (const workspace of normalized.workspaces) {
      const validation = validateWorkspace(workspace);
      if (!validation.ok) {
        throw new Error(`${workspace.name || workspace.id}: ${validation.message}`);
      }
    }

    if (recordHistory && this.cache) {
      this.pushUndoSnapshot(this.cache);
    }

    this.cache = normalized;
    await this.persistCache({ recordHistory: false });
  }

  async getWorkspaces(): Promise<Workspace[]> {
    await this.ensureLoaded();
    return this.cache!.workspaces.map((workspace) => this.cloneWorkspace(workspace));
  }

  async getStoredWorkspace(workspaceId: string): Promise<StoredWorkspace | null> {
    await this.ensureLoaded();
    const content = this.cache!.workspaces.find((workspace) => workspace.id === workspaceId);
    if (!content) {
      return null;
    }
    const security = this.cache!.workspaceSecurity?.[workspaceId] ?? { isTrusted: true, revision: 1 };
    return {
      content: this.cloneWorkspace(content),
      security: { ...security },
      revision: security.revision,
    };
  }

  async getWorkspaceSecurity(workspaceId: string): Promise<WorkspaceSecurityMetadata | null> {
    const stored = await this.getStoredWorkspace(workspaceId);
    return stored ? { ...stored.security } : null;
  }

  /** One-shot security map without cloning each workspace (list load). */
  async getWorkspaceSecurityMap(): Promise<Record<string, WorkspaceSecurityMetadata>> {
    await this.ensureLoaded();
    const result: Record<string, WorkspaceSecurityMetadata> = {};
    const stored = this.cache!.workspaceSecurity ?? {};
    for (const workspace of this.cache!.workspaces) {
      const security = stored[workspace.id] ?? { isTrusted: true, revision: 1 };
      result[workspace.id] = { ...security };
    }
    return result;
  }

  async grantTrust(
    workspaceId: string,
    reviewToken: WorkspaceReviewToken,
  ): Promise<"granted" | "already" | "changed" | "invalid" | "missing"> {
    await this.flushRecentWrites();
    const data = await this.load();
    const workspace = data.workspaces.find((candidate) => candidate.id === workspaceId);
    if (!workspace) {
      return "missing";
    }
    const security = data.workspaceSecurity?.[workspaceId] ?? { isTrusted: true, revision: 1 };
    const currentStored: StoredWorkspace = { content: workspace, security, revision: security.revision };
    if (security.isTrusted) {
      return "already";
    }
    if (!matchesReviewToken(currentStored, reviewToken)) {
      return "changed";
    }
    const validation = validateWorkspace(workspace);
    if (!validation.ok) {
      return "invalid";
    }
    data.workspaceSecurity = { ...(data.workspaceSecurity ?? {}) };
    data.workspaceSecurity[workspaceId] = { isTrusted: true, revision: security.revision + 1 };
    await this.save(data, { preserveSecurity: false, allowSubmittedSecurity: true });
    return "granted";
  }

  async revokeTrust(workspaceId: string): Promise<"revoked" | "already" | "missing"> {
    await this.flushRecentWrites();
    const data = await this.load();
    const workspace = data.workspaces.find((candidate) => candidate.id === workspaceId);
    if (!workspace) {
      return "missing";
    }
    const security = data.workspaceSecurity?.[workspaceId] ?? { isTrusted: true, revision: 1 };
    if (!security.isTrusted) {
      return "already";
    }
    data.workspaceSecurity = { ...(data.workspaceSecurity ?? {}) };
    data.workspaceSecurity[workspaceId] = { isTrusted: false, revision: security.revision + 1 };
    await this.save(data, { preserveSecurity: false, allowSubmittedSecurity: true });
    return "revoked";
  }

  async getSettings(): Promise<QuickShellSettings> {
    if (this.settingsProvider) {
      return { ...this.settingsProvider() };
    }

    await this.ensureLoaded();
    return { ...this.cache!.settings };
  }

  async upsertWorkspace(workspace: Workspace): Promise<Workspace> {
    await this.flushRecentWrites();
    const data = await this.load();
    const normalized = normalizeWorkspace({
      ...workspace,
      id: ensureStableId(workspace.id),
      launches: workspace.launches.map((launch) => ({
        ...launch,
        id: ensureStableId(launch.id),
      })),
    });

    const validation = validateWorkspace(normalized);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    const index = data.workspaces.findIndex((item) => item.id === normalized.id);
    if (index >= 0) {
      data.workspaces[index] = normalized;
    } else {
      const countResult = validateWorkspaceCount(data.workspaces.length + 1);
      if (!countResult.ok) {
        throw new Error(countResult.message);
      }
      data.workspaces.push(normalized);
      data.workspaceSecurity = { ...(data.workspaceSecurity ?? {}) };
      data.workspaceSecurity[normalized.id] = { isTrusted: true, revision: 1 };
      data.layoutEntries = [...(data.layoutEntries ?? []), { type: "workspace", workspaceId: normalized.id }];
    }

    await this.save(data, { allowSubmittedSecurity: true });
    return normalized;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.flushRecentWrites();
    const data = await this.load();
    data.workspaces = data.workspaces.filter((workspace) => workspace.id !== workspaceId);
    data.layoutEntries = (data.layoutEntries ?? []).filter(
      (entry) => entry.type !== "workspace" || entry.workspaceId !== workspaceId,
    );
    await this.save(data);
  }

  async duplicateWorkspace(workspaceId: string): Promise<Workspace> {
    await this.flushRecentWrites();
    const data = await this.load();
    const source = data.workspaces.find((workspace) => workspace.id === workspaceId);
    if (!source) {
      throw new Error("Workspace not found.");
    }

    const duplicate: Workspace = normalizeWorkspace({
      ...source,
      id: createStableId(),
      name: `${source.name} Copy`,
      abbreviation: source.abbreviation ? `${source.abbreviation}-copy` : null,
      isPinned: false,
      pinOrder: null,
      lastUsedUtc: null,
      launches: source.launches.map((launch) => ({
        ...launch,
        id: createStableId(),
      })),
    });

    const sourceSecurity = data.workspaceSecurity?.[workspaceId] ?? { isTrusted: true, revision: 1 };
    data.workspaces.push(duplicate);
    data.workspaceSecurity = { ...(data.workspaceSecurity ?? {}) };
    data.workspaceSecurity[duplicate.id] = { isTrusted: sourceSecurity.isTrusted, revision: 1 };
    data.layoutEntries = [...(data.layoutEntries ?? []), { type: "workspace", workspaceId: duplicate.id }];
    await this.save(data, { preserveSecurity: false, allowSubmittedSecurity: true });
    return duplicate;
  }

  async getBranchTargets(): Promise<Record<string, string>> {
    await this.ensureLoaded();
    return { ...(this.cache!.branchTargets ?? {}) };
  }

  async getBranchTarget(worktreeKey: string): Promise<string | null> {
    const targets = await this.getBranchTargets();
    return targets[worktreeKey.toLowerCase()] ?? null;
  }

  async setBranchTarget(worktreeKey: string, branch: string): Promise<void> {
    await this.flushRecentWrites();
    const data = await this.load();
    const key = worktreeKey.trim().toLowerCase();
    const value = branch.trim();
    if (!key || !value) {
      throw new Error("Worktree key and branch are required.");
    }
    if (!isSafeGitBranchName(value)) {
      throw new Error("Invalid branch name.");
    }
    data.branchTargets = { ...(data.branchTargets ?? {}), [key]: value };
    await this.save(data);
  }

  async clearBranchTarget(worktreeKey: string): Promise<void> {
    await this.flushRecentWrites();
    const data = await this.load();
    const key = worktreeKey.trim().toLowerCase();
    if (!data.branchTargets || !(key in data.branchTargets)) {
      return;
    }
    const next = { ...data.branchTargets };
    delete next[key];
    data.branchTargets = next;
    await this.save(data);
  }

  async getLayoutEntries(): Promise<LayoutEntry[]> {
    await this.ensureLoaded();
    return (this.cache!.layoutEntries ?? []).map((entry) => cloneLayoutEntry(entry));
  }

  async insertSeparator(title?: string | null, beforeWorkspaceId?: string): Promise<LayoutEntry> {
    await this.flushRecentWrites();
    const data = await this.load();
    const separator: LayoutEntry = {
      type: "separator",
      id: createStableId(),
      title: title?.trim() ? title.trim() : null,
    };
    const layout = [...(data.layoutEntries ?? [])];
    const insertAt = beforeWorkspaceId
      ? layout.findIndex((entry) => entry.type === "workspace" && entry.workspaceId === beforeWorkspaceId)
      : -1;
    if (insertAt >= 0) {
      layout.splice(insertAt, 0, separator);
    } else {
      layout.push(separator);
    }
    data.layoutEntries = layout;
    await this.save(data);
    return separator;
  }

  async removeLayoutEntry(entryId: string): Promise<void> {
    await this.flushRecentWrites();
    const data = await this.load();
    data.layoutEntries = (data.layoutEntries ?? []).filter((entry) => !layoutEntryMatchesId(entry, entryId));
    await this.save(data);
  }

  async moveLayoutEntry(entryId: string, direction: "up" | "down"): Promise<void> {
    await this.flushRecentWrites();
    const data = await this.load();
    const layout = [...(data.layoutEntries ?? [])];
    const index = layout.findIndex((entry) => layoutEntryMatchesId(entry, entryId));
    if (index < 0) {
      return;
    }
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= layout.length) {
      return;
    }
    const current = layout[index];
    layout[index] = layout[swapIndex];
    layout[swapIndex] = current;
    data.layoutEntries = layout;
    await this.save(data);
  }

  async setFavorite(workspaceId: string, isPinned: boolean): Promise<Workspace> {
    await this.flushRecentWrites();
    const data = await this.load();
    const workspace = data.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    workspace.isPinned = isPinned;
    if (isPinned) {
      const maxPinOrder = data.workspaces
        .filter((item) => item.isPinned && item.id !== workspaceId)
        .reduce((max, item) => Math.max(max, item.pinOrder ?? 0), 0);
      workspace.pinOrder = maxPinOrder + 1;
    } else {
      workspace.pinOrder = null;
    }

    await this.save(data);
    return { ...workspace };
  }

  /** Returns the moved workspace, or `null` when the move is a boundary no-op. */
  async moveFavorite(workspaceId: string, direction: "up" | "down" | "top" | "bottom"): Promise<Workspace | null> {
    await this.flushRecentWrites();
    const data = await this.load();
    const workspace = data.workspaces.find((item) => item.id === workspaceId);
    if (!workspace || !workspace.isPinned) {
      throw new Error("Favorite workspace not found.");
    }

    // Same order as browse favorites: null pinOrder sorts last, then name.
    const favorites = getFavoriteWorkspaces(data.workspaces);
    const index = favorites.findIndex((item) => item.id === workspaceId);
    if (index < 0) {
      throw new Error("Favorite workspace not found.");
    }

    const targetIndex =
      direction === "up"
        ? index - 1
        : direction === "down"
          ? index + 1
          : direction === "top"
            ? 0
            : favorites.length - 1;
    if (targetIndex < 0 || targetIndex >= favorites.length || targetIndex === index) {
      return null;
    }

    if (direction === "up" || direction === "down") {
      const current = favorites[index];
      favorites[index] = favorites[targetIndex];
      favorites[targetIndex] = current;
    } else {
      const [item] = favorites.splice(index, 1);
      favorites.splice(targetIndex, 0, item);
    }

    favorites.forEach((item, orderIndex) => {
      item.pinOrder = orderIndex + 1;
    });

    await this.save(data);
    return { ...favorites[targetIndex] };
  }

  async markWorkspaceUsed(workspaceId: string, usedAt = new Date()): Promise<void> {
    await this.ensureLoaded();
    const workspace = this.cache!.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found.");
    }
    workspace.lastUsedUtc = usedAt.toISOString();
    this.recentWriteDirty = true;
    this.scheduleRecentWriteFlush();
  }

  async flushRecentWrites(): Promise<void> {
    if (this.recentWriteTimer) {
      clearTimeout(this.recentWriteTimer);
      this.recentWriteTimer = null;
    }
    if (!this.recentWriteDirty || !this.cache) {
      return;
    }
    this.recentWriteDirty = false;
    await this.persistCache({ recordHistory: false });
  }

  async updateSettings(settings: QuickShellSettings): Promise<void> {
    if (this.settingsProvider) {
      throw new Error("Settings are managed in Raycast extension preferences.");
    }

    await this.flushRecentWrites();
    const data = await this.load();
    data.settings = { ...settings };
    await this.save(data);
  }

  private async ensureLoaded(): Promise<void> {
    if (this.cache) {
      return;
    }

    const raw = await this.adapter.getItem(STORAGE_KEY);
    if (!raw) {
      this.cache = createEmptyStoredData();
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      this.cache = migrateStoredData(parsed);
    } catch {
      this.cache = createEmptyStoredData();
    }

    const coerced = coerceTrustedWhileDisabled(
      this.cache.workspaceSecurity,
      this.cache.workspaces.map((workspace) => workspace.id),
    );
    if (coerced.changed) {
      this.cache.workspaceSecurity = coerced.security;
      await this.persistCache({ recordHistory: false });
    }
  }

  private async persistCache(options?: { recordHistory?: boolean }): Promise<void> {
    if (!this.cache) {
      return;
    }
    await this.adapter.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    if (options?.recordHistory) {
      // no-op: history is recorded in save()
    }
  }

  private pushUndoSnapshot(data: StoredData): void {
    this.undoHistory.push(this.cloneData(data));
    if (this.undoHistory.length > MAX_HISTORY_ENTRIES) {
      this.undoHistory.shift();
    }
    this.redoHistory = [];
  }

  private scheduleRecentWriteFlush(): void {
    if (this.recentWriteTimer) {
      clearTimeout(this.recentWriteTimer);
    }
    this.recentWriteTimer = setTimeout(() => {
      void this.flushRecentWrites().catch(() => {
        this.recentWriteDirty = true;
      });
    }, RECENT_WRITE_DEBOUNCE_MS);
  }

  private cloneData(data: StoredData): StoredData {
    return {
      version: data.version,
      settings: { ...data.settings },
      workspaces: data.workspaces.map((workspace) => ({
        ...workspace,
        launches: workspace.launches.map((launch) => ({ ...launch })),
        companionApps: workspace.companionApps?.map((entry) => ({ ...entry })),
      })),
      workspaceSecurity: data.workspaceSecurity
        ? Object.fromEntries(Object.entries(data.workspaceSecurity).map(([id, security]) => [id, { ...security }]))
        : {},
      branchTargets: { ...(data.branchTargets ?? {}) },
      layoutEntries: (data.layoutEntries ?? []).map((entry) => cloneLayoutEntry(entry)),
    };
  }

  private cloneWorkspace(workspace: Workspace): Workspace {
    return {
      ...workspace,
      launches: workspace.launches.map((launch) => ({ ...launch })),
      companionApps: workspace.companionApps?.map((entry) => ({ ...entry })),
    };
  }

  private preserveCurrentTrust(next: StoredData, current: StoredData | null): StoredData {
    const currentSecurity = current?.workspaceSecurity ?? {};
    next.workspaceSecurity = Object.fromEntries(
      next.workspaces.map((workspace) => {
        const security = currentSecurity[workspace.id];
        if (!security) {
          return [workspace.id, createIngressSecurity()];
        }

        const currentWorkspace = current?.workspaces.find((candidate) => candidate.id === workspace.id);
        const contentChanged = currentWorkspace ? digest(currentWorkspace) !== digest(workspace) : true;
        return [
          workspace.id,
          {
            ...security,
            revision: contentChanged ? security.revision + 1 : security.revision,
          },
        ];
      }),
    );
    return next;
  }
}

function cloneLayoutEntry(entry: LayoutEntry): LayoutEntry {
  if (entry.type === "separator") {
    return { type: "separator", id: entry.id, title: entry.title ?? null };
  }
  return { type: "workspace", workspaceId: entry.workspaceId };
}

function layoutEntryMatchesId(entry: LayoutEntry, entryId: string): boolean {
  return entry.type === "separator" ? entry.id === entryId : entry.workspaceId === entryId;
}

/** Keep separators; drop missing workspaces; append any workspaces not yet in layout. */
export function syncLayoutEntries(layout: LayoutEntry[] | undefined, workspaces: Workspace[]): LayoutEntry[] {
  if (!layout || layout.length === 0) {
    return synthesizeLayoutEntries(workspaces);
  }

  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const seen = new Set<string>();
  const next: LayoutEntry[] = [];

  for (const entry of layout) {
    if (entry.type === "separator") {
      next.push(cloneLayoutEntry(entry));
      continue;
    }
    if (!workspaceIds.has(entry.workspaceId) || seen.has(entry.workspaceId)) {
      continue;
    }
    seen.add(entry.workspaceId);
    next.push({ type: "workspace", workspaceId: entry.workspaceId });
  }

  for (const workspace of workspaces) {
    if (!seen.has(workspace.id)) {
      next.push({ type: "workspace", workspaceId: workspace.id });
    }
  }

  return next;
}

export function createMemoryStorageAdapter(initial?: StoredData): StorageAdapter {
  const memory = new Map<string, string>();
  if (initial) {
    memory.set(STORAGE_KEY, JSON.stringify(initial));
  }
  return {
    async getItem(key: string) {
      return memory.get(key);
    },
    async setItem(key: string, value: string) {
      memory.set(key, value);
    },
  };
}

export function workspaceSubtitle(workspace: Workspace, launch?: LaunchEntry): string {
  if (launch) {
    const command = launch.command?.trim();
    return command
      ? `${workspace.directory} • ${launch.label}: ${command}`
      : `${workspace.directory} • ${launch.label}`;
  }

  const enabledLaunches = workspace.launches.filter((entry) => entry.isEnabled);
  if (enabledLaunches.length === 1) {
    const command = enabledLaunches[0].command?.trim();
    return command ? `${workspace.directory} • ${command}` : workspace.directory;
  }

  if (enabledLaunches.length > 1) {
    return `${workspace.directory} • ${enabledLaunches.length} launches`;
  }

  return workspace.directory;
}
