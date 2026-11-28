import { listenerBase, type Pair } from "./pair"
import type { Catalog, CatalogEntry, CatalogPerson } from "./line"

export type CatalogResult =
  { ok: true; catalog: Catalog } | { ok: false; reason: "locked" | "unauthorized" | "offline" | "bad" }

export type TuckStatus = "filed" | "queued" | "sent"

export type TuckResult =
  | { ok: true; status: TuckStatus; noteId?: string }
  | { ok: false; reason: "unauthorized" | "offline" | "bad"; error?: string }
  | { ok: false; reason: "rejected"; error: string }

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** The same trimmed line keeps one id, so a double submit files once. */
export function captureIdentity(
  text: string,
  previous: { key: string; id: string } | null,
  nextId: () => string,
): { key: string; id: string } {
  const key = text.trim()
  if (previous && previous.key === key) return previous
  return { key, id: nextId() }
}

export async function getCatalog(pair: Pair, fetchImpl: FetchLike = fetch): Promise<CatalogResult> {
  const response = await request(pair, "/catalog", undefined, fetchImpl)
  if (!response.ok) return response
  if (response.status === 423) return { ok: false, reason: "locked" }
  if (response.status === 401) return { ok: false, reason: "unauthorized" }
  if (response.status !== 200) return { ok: false, reason: "bad" }
  const catalog = readCatalog(response.body)
  if (!catalog) return { ok: false, reason: "bad" }
  return { ok: true, catalog }
}

export async function postCapture(
  pair: Pair,
  capture: { id: string; text: string },
  fetchImpl: FetchLike = fetch,
): Promise<TuckResult> {
  const response = await request(pair, "/captures", JSON.stringify({ id: capture.id, text: capture.text }), fetchImpl)
  if (!response.ok) return { ok: false, reason: response.reason }
  if (response.status === 401) return { ok: false, reason: "unauthorized" }
  return readReceipt(response.status, response.body)
}

async function request(
  pair: Pair,
  path: "/catalog" | "/captures",
  body: string | undefined,
  fetchImpl: FetchLike,
): Promise<{ ok: true; status: number; body: unknown } | { ok: false; reason: "offline" }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${pair.token}`,
  }
  if (body != null) headers["Content-Type"] = "application/json"
  try {
    const response = await fetchImpl(`${listenerBase(pair)}${path}`, {
      method: body == null ? "GET" : "POST",
      headers,
      body,
      redirect: "error",
      signal: AbortSignal.timeout(4_000),
    })
    const text = await response.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text) as unknown
      } catch {
        parsed = null
      }
    }
    return { ok: true, status: response.status, body: parsed }
  } catch {
    return { ok: false, reason: "offline" }
  }
}

function readCatalog(value: unknown): Catalog | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const brains = readEntries(record.brains)
  const tags = readEntries(record.tags)
  const people = readPeople(record.people)
  const defaultBrain = readEntry(record.defaultBrain)
  if (!brains || !tags || !people || !defaultBrain) return null
  return { brains, tags, people, defaultBrain }
}

function readEntries(value: unknown): CatalogEntry[] | null {
  if (!Array.isArray(value)) return null
  const entries: CatalogEntry[] = []
  for (const item of value) {
    const entry = readEntry(item)
    if (entry) entries.push(entry)
  }
  return entries
}

function readEntry(value: unknown): CatalogEntry | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (typeof record.id !== "string" || typeof record.name !== "string" || typeof record.path !== "string") {
    return null
  }
  if (!record.id || !record.name || !record.path) return null
  return { id: record.id, name: record.name, path: record.path }
}

function readPeople(value: unknown): CatalogPerson[] | null {
  if (!Array.isArray(value)) return null
  const people: CatalogPerson[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const record = item as Record<string, unknown>
    if (typeof record.id !== "string" || typeof record.name !== "string" || !record.id || !record.name) continue
    people.push({ id: record.id, name: record.name })
  }
  return people
}

function readReceipt(status: number, value: unknown): TuckResult {
  if (!value || typeof value !== "object") return { ok: false, reason: "bad" }
  const record = value as Record<string, unknown>
  if (status === 400) {
    const error = typeof record.error === "string" && record.error.trim() ? record.error.trim() : "Nothing to tuck"
    return { ok: false, reason: "rejected", error }
  }
  if (status === 202 && record.status === "queued") return { ok: true, status: "queued" }
  if (status === 200 && record.status === "filed") {
    const noteId = typeof record.noteId === "string" && record.noteId ? record.noteId : undefined
    return { ok: true, status: "filed", noteId }
  }
  if (status === 200 && record.status === "sent") return { ok: true, status: "sent" }
  return { ok: false, reason: "bad" }
}
