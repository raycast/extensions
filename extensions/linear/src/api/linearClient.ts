import { LinearClient, LinearGraphQLClient } from "@linear/sdk";
import { environment, LaunchType, LocalStorage } from "@raycast/api";

import { refreshQuickCommandSubtitles } from "../helpers/refreshQuickSubtitles";

import { ensureToken, fetchViewerIdentity, getServiceForProviderId, linear } from "./oauth";
import {
  EntryRef,
  entryKey,
  getActiveEntry,
  migrateIfNeeded,
  reconcileEntries,
  setActiveEntry,
  WorkspaceEntry,
  WorkspaceRegistry,
} from "./workspaces";

const clientsByProviderId = new Map<string, LinearClient>();
const tokensByProviderId = new Map<string, string>();
let activeProviderId: string | null = null;

export type WorkspaceSnapshot = {
  registry: WorkspaceRegistry;
  activeEntry: WorkspaceEntry | null;
  // Entry keys whose client holds no token — "Needs re-authentication" must surface in
  // ordinary command UI too, not only in Manage Workspaces (§4.2 View-bootstrap reconciliation).
  needsReauth: string[];
};

let lastBootstrap: WorkspaceSnapshot | null = null;

// Render-time access to the launch-resolved workspace state (set by bootstrapWorkspaceAuth,
// which the withWorkspaceAuth wrapper awaits before anything renders or executes).
export function getWorkspaceSnapshot(): WorkspaceSnapshot | null {
  return lastBootstrap;
}

type GraphQLResult<Data> = { data?: Data; errors?: Array<{ message?: string }> };

// Upstream (41baddf044): surface the first GraphQL error message instead of the SDK's
// generic failure. Installed on every per-workspace client by makeClient.
async function makeGraphQLRequest<Data, Variables extends Record<string, unknown>>(
  url: string,
  options: RequestInit,
  query: string,
  variables?: Variables,
  requestHeaders?: RequestInit["headers"],
) {
  const body = JSON.stringify({ query, variables });
  const headers = new Headers(options.headers);
  new Headers(requestHeaders).forEach((value, key) => headers.set(key, value));
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    method: "POST",
    headers: Object.fromEntries(headers.entries()),
    body,
  });
  const result: string | GraphQLResult<Data> = response.headers.get("Content-Type")?.startsWith("application/json")
    ? ((await response.json()) as GraphQLResult<Data>)
    : await response.text();

  if (typeof result !== "string" && response.ok && !result.errors && result.data) {
    return { ...result, headers: response.headers, status: response.status };
  }

  throw new Error(
    typeof result === "string" ? result : (result.errors?.[0]?.message ?? `GraphQL Error (${response.status})`),
  );
}

export function makeClient(accessToken: string): LinearClient {
  const client = new LinearClient({
    accessToken,
    headers: {
      "public-file-urls-expire-in": "60",
      "linear-raycast-extension-name": environment.extensionName,
    },
  });
  const graphQLClient = client.client as unknown as {
    url: string;
    options: RequestInit;
    rawRequest: LinearGraphQLClient["rawRequest"];
  };
  graphQLClient.rawRequest = ((query, variables, requestHeaders) =>
    makeGraphQLRequest(
      graphQLClient.url,
      graphQLClient.options,
      query,
      variables,
      requestHeaders,
    )) as LinearGraphQLClient["rawRequest"];
  return client;
}

function isBackgroundLaunch(): boolean {
  return environment.launchType === LaunchType.Background;
}

function serviceForEntry(entry: WorkspaceEntry) {
  return getServiceForProviderId(
    entry.providerId,
    `Connect to ${entry.orgName} (${entry.userEmail})`,
    `Linear — ${entry.orgName}`,
  );
}

// Interactive grants bind to whatever account/workspace is active at linear.app (spike S3),
// so any token MINTED interactively into an entry-keyed slot must be identity-verified
// before use — otherwise workspace X's token silently lands under entry Y (a D10
// violation: every "Y" query would really hit X). Slot 0 is NOT exempt: once migration
// has bound an identity to the "linear" entry, a fully revoked authorization re-granted
// while another workspace is active at linear.app could corrupt it the same way —
// verification is one API call and only runs on actual mints.
export async function ensureEntryToken(entry: WorkspaceEntry, options: { interactive: boolean }): Promise<string> {
  const service = serviceForEntry(entry);
  const existing = await service.client.getTokens();
  const hadUsableToken = Boolean(existing?.accessToken && !existing.isExpired());
  const token = await ensureToken(service, options);
  const possiblyMinted = options.interactive && !hadUsableToken;
  if (possiblyMinted && token !== existing?.accessToken) {
    const identity = await fetchViewerIdentity(token);
    if (identity.orgId !== entry.orgId || identity.userId !== entry.userId) {
      await service.client.removeTokens();
      throw new Error(
        `Linear granted access for ${identity.orgName} (${identity.userEmail}), not ` +
          `${entry.orgName} (${entry.userEmail}). Switch to that account and workspace at ` +
          `linear.app (top-left switcher), then try again — or use Add Workspace to connect it.`,
      );
    }
  }
  return token;
}

// D11 follow-up: constructing a labeled OAuthService is pure in-process object creation —
// it never reaches Raycast, so the Settings account-row label only has a chance to update
// the next time a token is actually WRITTEN through that labeled client. This does a single
// benign re-write of slot 0's existing token set through the labeled client, once, so the
// row has a shot at picking up the "Linear — <org>" label. Guarded by a LocalStorage flag so
// it only ever runs once; a failure here must never affect bootstrap.
const SLOT0_RELABEL_KEY = "slot0-relabelled-v1";

async function relabelSlot0Once(entry: WorkspaceEntry): Promise<void> {
  if (entry.providerId !== "linear") return; // only slot 0 needs this touch
  if (isBackgroundLaunch()) return; // foreground only
  try {
    if (await LocalStorage.getItem<string>(SLOT0_RELABEL_KEY)) return;
    const labeled = getServiceForProviderId("linear", undefined, `Linear — ${entry.orgName}`);
    const tokens = await labeled.client.getTokens();
    if (!tokens?.accessToken) return; // nothing to re-write; do NOT set the flag
    // setTokens re-stamps updatedAt to now, so pass the REMAINING lifetime (same math as
    // completeAddFromStaging), not the original duration. Omit expiresIn entirely when the
    // stored set lacks it — defaulting would make a non-expiring token look expiring.
    const elapsedSeconds = Math.floor((Date.now() - tokens.updatedAt.getTime()) / 1000);
    await labeled.client.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      idToken: tokens.idToken,
      scope: tokens.scope,
      ...(tokens.expiresIn !== undefined ? { expiresIn: Math.max(60, tokens.expiresIn - elapsedSeconds) } : {}),
    });
    await LocalStorage.setItem(SLOT0_RELABEL_KEY, new Date().toISOString());
  } catch {
    // Never break launch for a cosmetic relabel; retry on a later launch.
  }
}

function cacheClient(providerId: string, token: string): LinearClient {
  const cached = clientsByProviderId.get(providerId);
  if (cached && tokensByProviderId.get(providerId) === token) return cached;
  const client = makeClient(token);
  clientsByProviderId.set(providerId, client);
  tokensByProviderId.set(providerId, token);
  return client;
}

// Resolve the active workspace ONCE at command launch (design D2); later launches
// follow whatever the registry says then, but this process stays pinned.
export async function bootstrapWorkspaceAuth(options?: { interactive?: boolean }): Promise<{
  token: string;
  registry: WorkspaceRegistry;
  activeEntry: WorkspaceEntry | null;
}> {
  const interactive = options?.interactive ?? !isBackgroundLaunch();
  const registry = await migrateIfNeeded({ allowWrite: interactive });
  const activeEntry = getActiveEntry(registry);
  // Record the selection BEFORE any token work, so the auth error boundary can name
  // the workspace that failed (edge case 1) even when the token fetch throws.
  lastBootstrap = { registry, activeEntry, needsReauth: [] };

  if (!activeEntry) {
    // Fresh install: drive the slot-0 interactive login (today's exact first-run behavior),
    // then adopt it on the next foreground bootstrap via migrateIfNeeded.
    const token = await ensureToken(linear, { interactive });
    cacheClient("linear", token);
    activeProviderId = "linear";
    return { token, registry, activeEntry: null };
  }

  const token = await ensureEntryToken(activeEntry, { interactive });
  cacheClient(activeEntry.providerId, token);
  activeProviderId = activeEntry.providerId;
  // Fire-and-forget, cosmetic only: nothing downstream depends on this completing, and
  // awaiting it would add a getTokens+setTokens round-trip to every foreground launch
  // until the one-time flag is set (D-fix, slot-0 relabel touch).
  if (options?.interactive !== false) void relabelSlot0Once(activeEntry);
  // View-bootstrap reconciliation (§4.2): entries whose tokens vanished surface as
  // "Needs re-authentication" in ordinary command UI via the snapshot.
  const reconciled = await reconcileEntries(registry);
  lastBootstrap = {
    registry,
    activeEntry,
    needsReauth: reconciled.filter((r) => !r.hasToken).map((r) => entryKey(r.entry)),
  };
  return { token, registry, activeEntry };
}

// P1/P1b/P2 switch semantics (design D2): ensure the target workspace's client BEFORE
// persisting it as the new global default. Persisting first (the earlier ordering) left
// a canceled/failed OAuth with the registry default already pointing at the broken
// workspace — the "no workspace registered" throw would fire only after that write.
// Look-up is read-only (allowWrite: false); only a successful ensure reaches the write.
export async function activateWorkspace(ref: EntryRef): Promise<WorkspaceEntry> {
  const lookupRegistry = await migrateIfNeeded({ allowWrite: false });
  const lookupEntry = lookupRegistry.workspaces.find((w) => entryKey(w) === entryKey(ref));
  if (!lookupEntry) throw new Error(`No workspace registered for ${entryKey(ref)}`);
  await getLinearClientFor(ref, { interactive: true }); // ensures token + caches the client

  const registry = await setActiveEntry(ref);
  const entry = registry.workspaces.find((w) => entryKey(w) === entryKey(ref));
  if (!entry) throw new Error(`No workspace registered for ${entryKey(ref)}`);
  activeProviderId = entry.providerId;
  lastBootstrap = {
    registry,
    activeEntry: entry,
    // The target just authenticated successfully — drop any stale badge for it.
    needsReauth: (lastBootstrap?.needsReauth ?? []).filter((key) => key !== entryKey(ref)),
  };
  refreshQuickCommandSubtitles(); // fire-and-forget: root-search subtitles pegged to the active workspace are now stale
  return entry;
}

// Pinned-flow variant (design D2/D7): swaps THIS process's active client and snapshot
// WITHOUT persisting a new global default. Used by draft-opened forms whose draft
// targets a non-default workspace — the form must read AND submit in the draft's
// workspace while the registry default stays untouched.
export async function activateWorkspaceInMemory(ref: EntryRef): Promise<WorkspaceEntry> {
  const registry = await migrateIfNeeded({ allowWrite: false });
  const entry = registry.workspaces.find((w) => entryKey(w) === entryKey(ref));
  if (!entry) throw new Error(`No workspace registered for ${entryKey(ref)}`);
  await getLinearClientFor(ref, { interactive: true });
  activeProviderId = entry.providerId;
  lastBootstrap = {
    registry,
    activeEntry: entry,
    needsReauth: (lastBootstrap?.needsReauth ?? []).filter((key) => key !== entryKey(ref)),
  };
  return entry;
}

// AI-tool variant of activateWorkspaceInMemory (§4.3): NON-interactive, in-memory only.
// Every AI tool call is a fresh process (spike S8), so pointing this process's sync fast
// path at the target entry is enough for linearUtils.client() and every resolve* helper
// to act in that workspace. A dead token throws (caller turns it into a Manage Workspaces
// hint); nothing here ever opens a browser flow or deletes a token.
export async function activateToolWorkspace(ref: EntryRef): Promise<WorkspaceEntry> {
  const registry = await migrateIfNeeded({ allowWrite: false });
  const entry = registry.workspaces.find((w) => entryKey(w) === entryKey(ref));
  if (!entry) throw new Error(`No workspace registered for ${entryKey(ref)}`);
  await getLinearClientFor(ref, { interactive: false });
  activeProviderId = entry.providerId;
  lastBootstrap = {
    registry,
    activeEntry: entry,
    needsReauth: (lastBootstrap?.needsReauth ?? []).filter((key) => key !== entryKey(ref)),
  };
  return entry;
}

// Synchronous fast path — signature identical to today's; all 16 src/api/* callers
// keep working unmodified in this slice.
export function getLinearClient(): { linearClient: LinearClient; graphQLClient: LinearGraphQLClient } {
  const client = activeProviderId ? clientsByProviderId.get(activeProviderId) : undefined;
  if (!client) {
    throw new Error("No linear client initialized");
  }
  return { linearClient: client, graphQLClient: client.client };
}

// Entry-addressed client access for pinned flows, Manage Workspaces, the menu bar,
// and AI tools (D10: two entries can share an orgId — the ref carries userId too).
export async function getLinearClientFor(
  ref: EntryRef,
  options?: { interactive?: boolean },
): Promise<{ linearClient: LinearClient; graphQLClient: LinearGraphQLClient }> {
  const registry = await migrateIfNeeded({ allowWrite: false });
  const entry = registry.workspaces.find((w) => entryKey(w) === entryKey(ref));
  if (!entry) {
    throw new Error(`No workspace registered for ${entryKey(ref)}`);
  }
  // Always re-ensure before reuse: a cached client's token can expire mid-process
  // (24 h tokens; ensureToken short-circuits fast when the stored token is valid).
  const interactive = options?.interactive ?? !isBackgroundLaunch();
  const token = await ensureEntryToken(entry, { interactive });
  const client = cacheClient(entry.providerId, token);
  return { linearClient: client, graphQLClient: client.client };
}

// Explicit-client override for callers that serve more than one workspace in a single
// process (menu bar, AI tools): falls back to the sync fast path when no client is given.
export function resolveClient(client?: LinearClient): {
  linearClient: LinearClient;
  graphQLClient: LinearGraphQLClient;
} {
  if (client) return { linearClient: client, graphQLClient: client.client };
  return getLinearClient();
}

// Used by View.tsx's auth error boundary ("Sign in Again"): clear exactly the
// active entry's tokens so the next bootstrap re-authenticates it.
export async function clearActiveWorkspaceTokens(): Promise<void> {
  const registry = await migrateIfNeeded({ allowWrite: false });
  const activeEntry = getActiveEntry(registry);
  const service = activeEntry ? serviceForEntry(activeEntry) : linear;
  await service.client.removeTokens();
  if (activeProviderId) clientsByProviderId.delete(activeProviderId);
  activeProviderId = null;
}
