import { LocalStorage } from "@raycast/api";

import {
  ensureToken,
  fetchViewerIdentity,
  getServiceForProviderId,
  linear,
  workspaceProviderId,
  ViewerIdentity,
} from "./oauth";

export type EntryRef = { orgId: string; userId: string };

// D10: the unit of identity is the (workspace, account) PAIR. Two entries may share
// an orgId (same workspace under two accounts) — never key anything by bare orgId.
export function entryKey(ref: EntryRef): string {
  return `${ref.orgId}:${ref.userId}`;
}

export type WorkspaceEntry = EntryRef & {
  orgName: string;
  urlKey: string;
  userEmail: string;
  providerId: string;
};

export type WorkspaceRegistry = {
  version: 1;
  updatedAt: string;
  workspaces: WorkspaceEntry[];
  active: EntryRef | null;
};

const REGISTRY_KEY = "workspace-registry";
// Recovery copy (edge case 9): Raycast has NO API to enumerate stored OAuth providerIds,
// so a corrupt primary value would otherwise strand every linear-ws-* token unrecoverably.
// Every write mirrors to the backup; reads fall back to it before giving up.
const REGISTRY_BACKUP_KEY = "workspace-registry-backup";

function emptyRegistry(): WorkspaceRegistry {
  return { version: 1, updatedAt: new Date(0).toISOString(), workspaces: [], active: null };
}

function parseRegistry(raw: string | undefined): WorkspaceRegistry | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WorkspaceRegistry;
    if (parsed.version !== 1 || !Array.isArray(parsed.workspaces)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readRegistry(): Promise<WorkspaceRegistry> {
  const primary = parseRegistry(await LocalStorage.getItem<string>(REGISTRY_KEY));
  if (primary) return primary;
  const backup = parseRegistry(await LocalStorage.getItem<string>(REGISTRY_BACKUP_KEY));
  if (backup) return backup; // corrupt/lost primary healed from the mirror (edge case 9)
  return emptyRegistry();
}

// Foreground writers only. The menu-bar process is strictly read-only on the registry (§4.2).
export async function writeRegistry(
  mutate: (current: WorkspaceRegistry) => WorkspaceRegistry,
): Promise<WorkspaceRegistry> {
  const fresh = await readRegistry(); // re-read immediately before writing: last-write-wins
  const next = { ...mutate(fresh), version: 1 as const, updatedAt: new Date().toISOString() };
  const serialized = JSON.stringify(next);
  await LocalStorage.setItem(REGISTRY_KEY, serialized);
  await LocalStorage.setItem(REGISTRY_BACKUP_KEY, serialized);
  return next;
}

export function getActiveEntry(registry: WorkspaceRegistry): WorkspaceEntry | null {
  if (registry.active) {
    const match = registry.workspaces.find((w) => entryKey(w) === entryKey(registry.active as EntryRef));
    if (match) return match;
  }
  return registry.workspaces[0] ?? null;
}

export async function setActiveEntry(ref: EntryRef): Promise<WorkspaceRegistry> {
  return writeRegistry((current) => ({ ...current, active: { orgId: ref.orgId, userId: ref.userId } }));
}

export async function upsertWorkspaceEntry(
  identity: ViewerIdentity,
): Promise<{ registry: WorkspaceRegistry; entry: WorkspaceEntry; isNew: boolean }> {
  const ref: EntryRef = { orgId: identity.orgId, userId: identity.userId };
  let entry: WorkspaceEntry | undefined;
  let isNew = false;
  const registry = await writeRegistry((current) => {
    const existing = current.workspaces.find((w) => entryKey(w) === entryKey(ref));
    if (existing) {
      // Same (org, user): overwrite path — refresh identity fields, same providerId (D10).
      entry = { ...existing, orgName: identity.orgName, urlKey: identity.urlKey, userEmail: identity.userEmail };
      return { ...current, workspaces: current.workspaces.map((w) => (entryKey(w) === entryKey(ref) ? entry! : w)) };
    }
    // New (org, user) pair — including a same-org-different-user entry (deliberate multi-view, D10).
    isNew = true;
    entry = {
      ...ref,
      orgName: identity.orgName,
      urlKey: identity.urlKey,
      userEmail: identity.userEmail,
      providerId: workspaceProviderId(identity.orgId, identity.userId),
    };
    return {
      ...current,
      workspaces: [...current.workspaces, entry],
      active: current.active ?? ref,
    };
  });
  return { registry, entry: entry!, isNew };
}

export async function removeWorkspaceEntry(ref: EntryRef): Promise<WorkspaceRegistry> {
  return writeRegistry((current) => {
    const remaining = current.workspaces.filter((w) => entryKey(w) !== entryKey(ref));
    const activeRemoved = current.active !== null && entryKey(current.active) === entryKey(ref);
    return {
      ...current,
      workspaces: remaining,
      // Logging out the active entry falls back to the first remaining one (edge case 3).
      active: activeRemoved
        ? remaining[0]
          ? { orgId: remaining[0].orgId, userId: remaining[0].userId }
          : null
        : current.active,
    };
  });
}

// Entries whose client holds no token render "Needs re-authentication" — never crash,
// never silently drop (§4.2 reconciliation; built-in sign-out can clear any subset, spike S5).
export async function reconcileEntries(
  registry: WorkspaceRegistry,
): Promise<Array<{ entry: WorkspaceEntry; hasToken: boolean }>> {
  return Promise.all(
    registry.workspaces.map(async (entry) => {
      try {
        const service = getServiceForProviderId(entry.providerId, undefined, `Linear — ${entry.orgName}`);
        const tokens = await service.client.getTokens();
        return { entry, hasToken: Boolean(tokens?.accessToken) };
      } catch {
        // "Never crash, never drop" is structural: a failing token read marks the entry
        // as needing re-auth (conservative) instead of rejecting the whole reconcile.
        return { entry, hasToken: false };
      }
    }),
  );
}

// Upgrade path (WS-04): no registry yet + the existing `linear` client holds a token
// → one viewer.organization call adopts it as workspace #1, active, providerId "linear".
// allowWrite=false is the background path (menu bar is read-only on the registry, §4.2):
// it returns the adopted registry in memory without persisting; the next foreground
// launch persists it.
export async function migrateIfNeeded(options: { allowWrite: boolean }): Promise<WorkspaceRegistry> {
  const current = await readRegistry();
  if (current.workspaces.length > 0) return current;

  const tokens = await linear.client.getTokens();
  if (!tokens?.accessToken) return current; // fresh install: nothing to adopt

  const accessToken = await ensureToken(linear, { interactive: false }).catch(() => null);
  if (!accessToken) return current; // expired with no usable refresh: bootstrap will re-auth interactively

  let identity: ViewerIdentity;
  try {
    identity = await fetchViewerIdentity(accessToken);
  } catch {
    // Offline / API failure during the migration window must NOT break an existing
    // single-workspace user (slice contract): stay unmigrated — bootstrap's slot-0 path
    // then serves the stored token exactly as the pre-slice code did; migration retries
    // on a later launch.
    return current;
  }
  const entry: WorkspaceEntry = {
    orgId: identity.orgId,
    userId: identity.userId,
    orgName: identity.orgName,
    urlKey: identity.urlKey,
    userEmail: identity.userEmail,
    providerId: "linear", // slot 0 keeps its existing storage label
  };
  const ref: EntryRef = { orgId: entry.orgId, userId: entry.userId };

  if (!options.allowWrite) {
    return { version: 1, updatedAt: new Date().toISOString(), workspaces: [entry], active: ref };
  }
  return writeRegistry((fresh) =>
    fresh.workspaces.length > 0 ? fresh : { ...fresh, workspaces: [entry], active: ref },
  );
}
