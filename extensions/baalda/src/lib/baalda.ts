import { getPreferenceValues } from "@raycast/api";

/**
 * Thin client for Baalda's MCP endpoint (Streamable HTTP, single JSON reply).
 *
 * Baalda exposes a Model Context Protocol endpoint at `<server>/api/mcp`,
 * authenticated with a token minted in the desktop app (Vault Settings → MCP).
 * The protocol is JSON-RPC 2.0: initialize once. The server is stateless and keeps
 * no session, then call tools via `tools/call`.
 *
 * Verified against the live managed service (api.baalda.com). Payload shapes:
 *  - list tools (list_vaults / list_folders / list_notes / search_notes) wrap
 *    their array in `{ results: [...] }` in structuredContent.
 *  - read_note / create_note return a flat object.
 *  - notes carry `relPath` (not `path`); folders carry `path` and `name`.
 */

export const ROOT_FOLDER = "__baalda_root__";

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export class BaaldaError extends Error {}

/* ── Types mirroring the server's MCP tool payloads ─────────────────────── */

export interface Vault {
  vaultId: string;
  name: string;
  role?: string;
}

export interface Folder {
  folderId: string;
  parentId?: string | null;
  name: string;
  path: string;
}

export interface NoteSummary {
  docId: string;
  folderId?: string | null;
  title: string;
  relPath: string;
  permission?: string;
  updatedAt?: string;
}

export interface NoteContent {
  docId: string;
  vaultId?: string;
  folderId?: string | null;
  title?: string;
  relPath?: string;
  permission?: string;
  content: string;
  revision?: string;
}

export interface SearchResult {
  docId: string;
  title?: string;
  relPath?: string;
  score?: number;
}

export interface CreateNoteResult {
  docId: string;
  vaultId?: string;
  title?: string;
  relPath?: string;
}

export interface UpdateNoteResult {
  docId: string;
  bytes: number;
  revision: string;
}

export interface AppendNoteResult {
  docId: string;
  appended: number;
  duplicate: boolean;
  revision: string;
}

export type NoteEdit =
  | { type: "replace"; find: string; replace: string; all?: boolean }
  | { type: "insert_before"; anchor: string; text: string }
  | { type: "insert_after"; anchor: string; text: string }
  | { type: "delete"; find: string; all?: boolean };

export interface EditNoteResult {
  docId: string;
  applied: number;
  bytes: number;
  revision: string;
}

export interface DeleteNoteResult {
  deleted: string;
}

export interface CreateFolderInput {
  vaultId: string;
  name: string;
  path: string;
  parentId?: string;
}

export interface CreateFolderResult {
  folderId: string;
  parentId?: string | null;
  name: string;
  path: string;
  adopted?: boolean;
}

export interface DeleteFolderResult {
  deleted: string;
  deletedNotes: number;
}

export interface MoveNoteInput {
  docId: string;
  relPath?: string;
  title?: string;
  folderId?: string | null;
}

export interface MoveNoteResult {
  docId: string;
  relPath: string;
  title: string;
  folderId: string | null;
}

export interface MoveFolderInput {
  folderId: string;
  path?: string;
  name?: string;
  parentId?: string | null;
}

export interface MoveFolderResult {
  folderId: string;
  name: string;
  path: string;
}

/* ── JSON-RPC plumbing ──────────────────────────────────────────────────── */

const REQUEST_TIMEOUT_MS = 15_000;

let rpcId = 0;
let initialized = false;

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

async function rpc(method: string, params?: Record<string, unknown>): Promise<unknown> {
  const { serverUrl, mcpToken } = prefs();
  if (!serverUrl || !mcpToken) {
    throw new BaaldaError(
      "Set your Baalda Server URL and MCP Token in the extension preferences (get a token in Baalda → Vault Settings → MCP).",
    );
  }

  const base = serverUrl.replace(/\/+$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${mcpToken.trim()}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      throw new BaaldaError(
        "Baalda rejected the MCP token (401). Check the token in extension preferences, or mint a new one in Baalda → Vault Settings → MCP.",
      );
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new BaaldaError(`Baalda server error ${res.status} at ${base}/api/mcp. ${text.slice(0, 200)}`);
    }

    const body = (await res.json()) as JsonRpcResponse;
    if (body.error) {
      throw new BaaldaError(`MCP error ${body.error.code}: ${body.error.message}`);
    }
    return body.result;
  } catch (error) {
    if (error instanceof BaaldaError) throw error;
    if (controller.signal.aborted) {
      throw new BaaldaError(`Baalda server at ${base} did not respond within ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
    }
    throw new BaaldaError(
      `Couldn't reach the Baalda server at ${base}. Check the Server URL in extension preferences.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await rpc("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "raycast-baalda", version: "1.0.0" },
  });
  initialized = true;
}

interface ToolResult {
  content?: { type: string; text?: string }[];
  structuredContent?: unknown;
  isError?: boolean;
}

/**
 * Call an MCP tool and unwrap its payload.
 * Preference order: structuredContent → parsed text content.
 * List tools wrap their array in `{ results: [...] }`, which we unwrap.
 */
async function callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  await ensureInitialized();
  const result = (await rpc("tools/call", { name, arguments: args })) as ToolResult;

  if (result?.isError) {
    const msg =
      result?.content
        ?.map((c) => c.text ?? "")
        .join("\n")
        .trim() || "Unknown tool error";
    throw new BaaldaError(msg);
  }

  let payload: unknown = result?.structuredContent;
  if (payload === undefined) {
    const text = result?.content?.find((c) => c.type === "text")?.text;
    if (typeof text === "string") {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
  }
  if (payload === undefined) payload = result;

  // Unwrap the `{ results: [...] }` envelope used by the list tools.
  if (
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    Array.isArray((payload as { results?: unknown }).results)
  ) {
    return (payload as { results: unknown }).results as T;
  }
  return payload as T;
}

/* ── Typed wrappers over Baalda's tool catalog ──────────────────────────── */

export const listVaults = () => callTool<Vault[]>("list_vaults", {});

export const listFolders = (vaultId: string) => callTool<Folder[]>("list_folders", { vaultId });

export const listNotes = (vaultId: string, folderId?: string) =>
  callTool<NoteSummary[]>("list_notes", folderId ? { vaultId, folderId } : { vaultId });

export const readNote = (docId: string) => callTool<NoteContent>("read_note", { docId });

export const searchNotes = (vaultId: string, query: string, k = 10) =>
  callTool<SearchResult[]>("search_notes", { vaultId, query, k });

export interface CreateNoteInput {
  vaultId: string;
  relPath: string;
  title?: string;
  folderId?: string;
  content?: string;
}

export const createNote = (input: CreateNoteInput) => callTool<CreateNoteResult>("create_note", { ...input });

export interface AppendNoteOptions {
  expectedRevision?: string;
  idempotencyKey?: string;
}

export const appendNote = (docId: string, text: string, options: AppendNoteOptions = {}) =>
  callTool<AppendNoteResult>("append_note", { docId, text, ...options });

export interface UpdateNoteInput {
  docId: string;
  content: string;
  expectedRevision?: string;
}

export const updateNote = (input: UpdateNoteInput) => callTool<UpdateNoteResult>("update_note", { ...input });

export interface EditNoteInput {
  docId: string;
  edits: NoteEdit[];
  expectedRevision?: string;
}

export const editNote = (input: EditNoteInput) => callTool<EditNoteResult>("edit_note", { ...input });

export const deleteNote = (docId: string) => callTool<DeleteNoteResult>("delete_note", { docId });

export const createFolder = (input: CreateFolderInput) => callTool<CreateFolderResult>("create_folder", { ...input });

export const deleteFolder = (folderId: string, recursive = false) =>
  callTool<DeleteFolderResult>("delete_folder", { folderId, recursive });

export const moveNote = (input: MoveNoteInput) => callTool<MoveNoteResult>("move_note", { ...input });

export const moveFolder = (input: MoveFolderInput) => callTool<MoveFolderResult>("move_folder", { ...input });

/** Resolve the vault to act on: the preference override, else the first accessible vault. */
export async function resolveVaultId(preferred?: string): Promise<Vault> {
  const vaults = await listVaults();
  if (!Array.isArray(vaults) || vaults.length === 0) {
    throw new BaaldaError("No Baalda vaults are accessible with this MCP token.");
  }
  const wanted = (preferred ?? prefs().defaultVaultId)?.trim();
  if (wanted) {
    const match = vaults.find((v) => v.vaultId === wanted || v.name.toLowerCase() === wanted.toLowerCase());
    if (match) return match;
    throw new BaaldaError(`Default vault "${wanted}" not found. Accessible: ${vaults.map((v) => v.name).join(", ")}`);
  }
  return vaults[0];
}

/** Slugify a title into a safe filename base. */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "note";
}

/** Build the vault-relative path for a quick-capture note, honoring the captureFolder preference. */
export function capturePath(title: string, date = new Date()): { relPath: string; folder: string } {
  const folder = (prefs().captureFolder ?? "").trim().replace(/^\/+|\/+$/g, "");
  const stamp = date.toISOString().slice(0, 10);
  const relPath = `${folder ? `${folder}/` : ""}${stamp}-${slugify(title)}.md`;
  return { relPath, folder };
}
