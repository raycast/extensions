import { z } from "zod";
import {
  cursorSchema,
  enqueueResultSchema,
  librarySchema,
  queryPageSchema,
  saveSchema,
  switchResultSchema,
  type PondCursor,
  appInfoSchema,
  libraryInfoSchema,
  operationPreviewSchema,
  copyFileResultSchema,
} from "./schemas";

export const DEFAULT_BASE_URL = "http://127.0.0.1:41610/api/v2";
export const PAGE_SIZE = 50;

export function validatedBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid Local API URL in the extension preferences.");
  }
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/+$/, "") !== "/api/v2"
  ) {
    throw new Error("Use Pond's local HTTP address ending in /api/v2, such as http://127.0.0.1:41610/api/v2.");
  }
  return url.toString().replace(/\/+$/, "");
}

export function validatedUrl(value: string): string {
  const result = z.url({ protocol: /^https?$/ }).safeParse(value.trim());
  if (!result.success) throw new Error("Enter a complete HTTP or HTTPS URL, such as https://example.com.");
  return result.data;
}

export function itemLink(libraryId: string, saveId: string): string {
  const url = new URL(`pond://item/${encodeURIComponent(saveId)}`);
  url.searchParams.set("library", libraryId);
  return url.toString();
}

export interface SearchInput {
  keywords?: string;
  source?: string;
  tag?: string;
  savedSince?: number;
  libraryId?: string;
  saveIds?: string[];
  cursor?: PondCursor | null;
  limit?: number;
}

export function validatedTags(tags: string[] = []): string[] {
  const parsed = z.array(z.string().trim().min(1)).max(100).safeParse(tags);
  if (!parsed.success) throw new Error("Use up to 100 non-empty tags.");
  return [...new Set(parsed.data)];
}

export function parseSavedSince(value?: string): number | undefined {
  if (!value) return undefined;
  const result = z.union([z.iso.date(), z.iso.datetime({ offset: true })]).safeParse(value);
  if (!result.success)
    throw new Error("Use a date such as 2026-10-01 or an ISO timestamp with a timezone for savedSince.");
  const timestamp = Date.parse(result.data);
  if (timestamp < 0) throw new Error("savedSince must be on or after January 1, 1970.");
  return timestamp;
}

export class PondClient {
  readonly baseUrl: string;
  private readonly token: string;
  private readonly fetcher: typeof fetch;

  constructor(options: { baseUrl?: string; token?: string; fetcher?: typeof fetch }) {
    this.baseUrl = validatedBaseUrl(options.baseUrl?.trim() || DEFAULT_BASE_URL);
    this.token = options.token?.trim() ?? "";
    this.fetcher = options.fetcher ?? fetch;
  }

  private async send(path: string, body?: unknown): Promise<Response> {
    if (!this.token) {
      throw new Error(
        "Copy the Local API Token from Pond Settings → General → Raycast into the extension preferences.",
      );
    }
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new Error("Pond took too long to respond. Check Pond before trying again.");
      }
      throw new Error("Could not connect to Pond. Open Pond and check the Local API URL in the extension preferences.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Pond rejected the token. Copy a fresh Local API Token from Pond Settings into the extension preferences.",
      );
    }
    return response;
  }

  private async request<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
    const response = await this.send(path, body);
    const payload: unknown = await response.json().catch(() => null);
    const failure = z.object({ status: z.literal("error"), error: z.string() }).safeParse(payload);
    if (failure.success) {
      const messages = new Map([
        ["no_files", "This save has no file to copy."],
        ["missing", "The file is missing from your Pond library."],
        ["not_found", "This save is no longer in your Pond library."],
        ["stale_preview", "The library changed. Refresh the search and try the action again."],
        ["unsupported_url", "Pond cannot archive this URL. Try opening it in Pond."],
      ]);
      throw new Error(messages.get(failure.data.error) ?? failure.data.error);
    }
    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? "This Pond API endpoint is unavailable. Update Pond to version 1.0.1 or later and check the Local API URL."
          : `Pond returned HTTP ${response.status}. Check Pond and try again.`,
      );
    }
    const parsed = z.object({ status: z.literal("success"), data: schema }).safeParse(payload);
    if (!parsed.success) throw new Error("Pond returned an unexpected response. Check that Pond is up to date.");
    return parsed.data.data;
  }

  async search({
    keywords = "",
    source,
    tag,
    savedSince,
    libraryId,
    saveIds,
    cursor = null,
    limit = PAGE_SIZE,
  }: SearchInput = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500)
      throw new Error("Choose a search limit between 1 and 500.");
    if (libraryId && cursor && libraryId !== cursor.libraryId)
      throw new Error("The cursor belongs to another library. Start a new search.");
    const page = await this.request("/library/query", queryPageSchema, {
      query: { combinator: "and", rules: [] },
      keywords: keywords.trim() || undefined,
      scope: source || tag || savedSince !== undefined || saveIds ? { source, tag, savedSince, saveIds } : undefined,
      libraryId: cursor?.libraryId ?? libraryId,
      cursor,
      limit,
      sortKey: "savedAt",
      sortDir: "desc",
    });
    const rows = page.ids.length
      ? await this.request("/saves/get", saveSchema.array(), { ids: page.ids, limit: page.ids.length })
      : [];
    const byId = new Map(rows.map((save) => [save.id, save]));
    return {
      saves: page.ids.flatMap((id) => {
        const save = byId.get(id);
        return save ? [{ ...save, libraryId: page.libraryId, pondUrl: itemLink(page.libraryId, id) }] : [];
      }),
      total: page.total,
      nextCursor: page.nextCursor,
      libraryId: page.libraryId,
    };
  }

  async getSave({ id, libraryId }: { id: string; libraryId: string }) {
    if (!id.trim() || !libraryId.trim()) throw new Error("Use a save ID and library ID returned by Search Library.");
    const page = await this.search({ saveIds: [id], libraryId, limit: 1 });
    const save = page.saves.find((item) => item.id === id);
    if (!save) throw new Error("This save is no longer in the active library. Search again.");
    return save;
  }

  enqueue(value: string, tags?: string[]) {
    return this.request("/enqueue", enqueueResultSchema, {
      url: validatedUrl(value),
      trigger: "raycast",
      tags: tags === undefined ? undefined : validatedTags(tags),
    });
  }

  appInfo() {
    return this.request("/app/info", appInfoSchema);
  }

  libraryInfo() {
    return this.request("/library/info", libraryInfoSchema);
  }

  libraries() {
    return this.request("/library/recent", librarySchema.array());
  }

  switchLibrary(path: string) {
    return this.request("/library/switch", switchResultSchema, { path });
  }

  async selectLibrary(path: string) {
    const library = (await this.libraries()).find((item) => item.path === path);
    if (!library) throw new Error("Choose an exact path returned by List Libraries.");
    if (!library.available && !library.active)
      throw new Error("This library is unavailable. Reconnect its disk or open it in Pond first.");
    if (!library.active) await this.switchLibrary(library.path);
    return { path: library.path, name: library.name, alreadyActive: library.active };
  }

  async copySaveFile({ id, libraryId }: { id: string; libraryId: string }) {
    const args = { id, fileIndex: 0 };
    const preview = await this.request("/operations/preview", operationPreviewSchema, {
      operation: "saves.copyFile",
      arguments: args,
    });
    if (preview.libraryId !== libraryId)
      throw new Error("The active library changed. Refresh the search before copying this file.");
    const result = await this.request("/operations/run", copyFileResultSchema, {
      operation: "saves.copyFile",
      arguments: args,
      token: preview.token,
    });
    if (!result.ok) throw new Error("This save has no available file to copy. Open it in Pond to check its files.");
    return result;
  }

  async thumbnail(id: string): Promise<{ bytes: Uint8Array; extension: string } | null> {
    const response = await this.send(`/saves/thumb?id=${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    const extensions = new Map([
      ["image/jpeg", "jpg"],
      ["image/png", "png"],
      ["image/gif", "gif"],
      ["image/webp", "webp"],
      ["image/avif", "avif"],
    ]);
    const extension = extensions.get(response.headers.get("content-type")?.split(";")[0].trim() ?? "");
    if (!response.ok || !extension) return null;
    return { bytes: new Uint8Array(await response.arrayBuffer()), extension };
  }
}

export function parseCursor(value?: string): PondCursor | null {
  if (!value) return null;
  try {
    const decoded: unknown = JSON.parse(value);
    return cursorSchema.parse(decoded);
  } catch {
    throw new Error("Invalid search cursor. Start a new search without a cursor.");
  }
}
