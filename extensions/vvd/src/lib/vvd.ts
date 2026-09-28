/**
 * The vvd platform API from Raycast: one place that knows where the key lives
 * (the extension preference, or the one "Connect vvd" stored) and one fetch
 * that speaks the `/api/v1` envelope. Every command calls the typed functions
 * below; none of them builds a URL or reads a preference on its own.
 */
import { LocalStorage, getPreferenceValues } from "@raycast/api"

import { NotConnectedError, VvdApiError, errorFromResponse } from "./api-error"
import {
  type ConnectStart,
  type PollOutcome,
  parseConnectStart,
  parsePollResponse,
} from "./connect-flow"
import { type Query, apiUrl, normalizeOrigin } from "./urls"

/** Declared in package.json; typed here so the build doesn't need raycast-env.d.ts. */
interface ExtensionPreferences {
  apiKey?: string
  origin?: string
}

const STORED_KEY = "vvd.accessKey"
const STORED_KEY_ORIGIN = "vvd.accessKeyOrigin"

export interface Connection {
  origin: string
  key: string
  /** Where the key came from — the preference wins over a stored connect key. */
  source: "preference" | "connect"
}

export function preferredOrigin(): string {
  return normalizeOrigin(getPreferenceValues<ExtensionPreferences>().origin)
}

/**
 * The credential to send, or null when there is none. A key pasted into the
 * preference always wins; otherwise the key "Connect vvd" minted, but only for
 * the origin it was minted at — pointing the extension at a beta build must not
 * send the production key there.
 */
export async function getConnection(): Promise<Connection | null> {
  const origin = preferredOrigin()
  const pasted = getPreferenceValues<ExtensionPreferences>().apiKey?.trim()
  if (pasted) return { origin, key: pasted, source: "preference" }
  const stored = await LocalStorage.getItem<string>(STORED_KEY)
  const storedOrigin = await LocalStorage.getItem<string>(STORED_KEY_ORIGIN)
  if (stored && (storedOrigin ?? origin) === origin) {
    return { origin, key: stored, source: "connect" }
  }
  return null
}

export async function requireConnection(): Promise<Connection> {
  const connection = await getConnection()
  if (!connection) throw new NotConnectedError()
  return connection
}

export async function storeConnectKey(
  origin: string,
  key: string,
): Promise<void> {
  await LocalStorage.setItem(STORED_KEY, key)
  await LocalStorage.setItem(STORED_KEY_ORIGIN, origin)
}

export async function clearConnectKey(): Promise<void> {
  await LocalStorage.removeItem(STORED_KEY)
  await LocalStorage.removeItem(STORED_KEY_ORIGIN)
}

type Method = "GET" | "POST" | "PATCH" | "DELETE"

interface RequestOptions {
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(
  connection: Connection,
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(apiUrl(connection.origin, path, options.query), {
    method,
    headers: {
      Authorization: `Bearer ${connection.key}`,
      Accept: "application/json",
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })
  const json: unknown = await response.json().catch(() => null)
  if (!response.ok) throw errorFromResponse(response.status, json)
  return json as T
}

// ── Types (the subset of each operation's output the extension reads) ──

export type WorldRole = "owner" | "admin" | "editor" | "viewer" | string

export interface World {
  id: string
  slug: string
  name: string
  role: WorldRole
}

export interface Me {
  userId: string
  name: string
  via: "key" | "cli" | "session" | "agent"
}

export interface SearchResult {
  documentId: string
  name: string
  documentType: string
  match: "name" | "content"
  snippet: string | null
}

export interface DocumentSummary {
  id: string
  name: string
  slug: string | null
  documentType: string
  parentId: string | null
  projectId: string | null
  listed: boolean
  updatedAt: string | null
}

export interface DocumentDetail {
  id: string
  name: string
  documentType: string
  parentId: string | null
  projectId: string | null
  updatedAt: string | null
  content: {
    data: unknown
    source: "live" | "stored" | "empty"
    text: string | null
  }
}

export interface CreatedDocument {
  id: string
  slug: string | null
  name: string
}

export interface AppliedContent {
  documentType: string
  applied: number
  changed: Array<{ id: string; label: string }>
}

export const EDITOR_ROLES: ReadonlySet<string> = new Set([
  "owner",
  "admin",
  "editor",
])

export function canEdit(world: Pick<World, "role">): boolean {
  return EDITOR_ROLES.has(world.role)
}

// ── Operations ──

export async function me(connection: Connection): Promise<Me> {
  return request<Me>(connection, "GET", "/me")
}

export async function listWorlds(connection: Connection): Promise<World[]> {
  const { worlds } = await request<{ worlds: World[] }>(
    connection,
    "GET",
    "/worlds",
  )
  return worlds
}

export async function searchWorld(
  connection: Connection,
  worldId: string,
  q: string,
  limit = 30,
): Promise<SearchResult[]> {
  const { results } = await request<{ results: SearchResult[] }>(
    connection,
    "GET",
    `/worlds/${worldId}/search`,
    { query: { q, limit } },
  )
  return results
}

export async function listDocuments(
  connection: Connection,
  worldId: string,
  options: { limit?: number; documentType?: string } = {},
): Promise<DocumentSummary[]> {
  const { documents } = await request<{ documents: DocumentSummary[] }>(
    connection,
    "GET",
    `/worlds/${worldId}/documents`,
    {
      query: { limit: options.limit ?? 50, documentType: options.documentType },
    },
  )
  return documents
}

export async function getDocument(
  connection: Connection,
  worldId: string,
  documentId: string,
): Promise<DocumentDetail> {
  return request<DocumentDetail>(
    connection,
    "GET",
    `/worlds/${worldId}/documents/${documentId}`,
  )
}

export async function createDocument(
  connection: Connection,
  worldId: string,
  input: { name: string; documentType: string },
): Promise<CreatedDocument> {
  return request<CreatedDocument>(
    connection,
    "POST",
    `/worlds/${worldId}/documents`,
    {
      body: input,
    },
  )
}

export async function applyContent(
  connection: Connection,
  worldId: string,
  documentId: string,
  ops: Array<{ op: string; [arg: string]: unknown }>,
): Promise<AppliedContent> {
  return request<AppliedContent>(
    connection,
    "POST",
    `/worlds/${worldId}/documents/${documentId}/content`,
    { body: { ops } },
  )
}

// ── The connect (device) flow — unauthenticated, outside /api/v1 ──

export async function startConnect(
  origin: string,
  clientLabel: string,
): Promise<ConnectStart> {
  const response = await fetch(`${origin}/api/cli/connect/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ clientLabel }),
  })
  const json: unknown = await response.json().catch(() => null)
  if (!response.ok) throw errorFromResponse(response.status, json)
  return parseConnectStart(json, origin)
}

export async function pollConnect(
  origin: string,
  deviceCode: string,
  signal?: AbortSignal,
): Promise<PollOutcome> {
  const response = await fetch(`${origin}/api/cli/connect/poll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ deviceCode }),
    signal,
  })
  const json: unknown = await response.json().catch(() => null)
  if (response.status >= 500)
    throw new VvdApiError("vvd is unavailable", response.status)
  return parsePollResponse(response.status, json)
}
