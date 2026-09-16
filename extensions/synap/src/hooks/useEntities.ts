import { useCachedPromise } from "@raycast/utils";
import { searchEntities, getRecentEntities, recallMemory, ask } from "../api/client";

// Mirrors the backend's QueryUnderstanding (packages/api/src/services/retrieval/
// understand-query.ts) — the hub-rest-client's AskResponse only types the fields
// it commits to, so `understanding` arrives through its `[key: string]: unknown`
// catch-all and we shape it ourselves here.
interface QueryUnderstanding {
  profileTypes: string[];
  confidence: number;
  /** The query with the matched type words stripped ('' for a pure type
   *  listing). Absent on a pod that predates the field. */
  cleanedQuery?: string;
}

export type QueryRoute =
  | { mode: "structured"; profileSlug: string; cleanedQuery?: string }
  | { mode: "semantic" }
  | { mode: "keyword" };

// Every hook takes options.podKey (the active pod's URL) as part of its cache
// key: switching pods must never surface another pod's cached results.

export function useEntitySearch(
  query: string,
  profileSlug?: string,
  options?: { execute?: boolean; workspaceId?: string; podKey?: string }
) {
  const allow = options?.execute !== false;
  const wsId = options?.workspaceId;
  return useCachedPromise(
    (q: string, slug: string | undefined, ws: string | undefined, _pod: string) =>
      searchEntities(q, { profileSlug: slug, limit: 50, ...(ws ? { workspaceId: ws } : { scope: "all" }) }),
    [query, profileSlug, wsId, options?.podKey ?? ""],
    {
      keepPreviousData: true,
      execute: allow && query.length > 0,
    }
  );
}

export function useRecentEntities(
  profileSlug?: string,
  options?: { execute?: boolean; workspaceId?: string; podKey?: string }
) {
  const allow = options?.execute !== false;
  const wsId = options?.workspaceId;
  return useCachedPromise(
    (slug: string | undefined, ws: string | undefined, _pod: string) =>
      getRecentEntities({ profileSlug: slug, limit: 30, ...(ws ? { workspaceId: ws } : { scope: "all" }) }),
    [profileSlug, wsId, options?.podKey ?? ""],
    { keepPreviousData: true, execute: allow }
  );
}

export function useSemanticSearch(
  query: string,
  options?: { execute?: boolean; workspaceId?: string; podKey?: string }
) {
  const allow = options?.execute !== false;
  const wsId = options?.workspaceId;
  return useCachedPromise(
    (q: string, ws: string | undefined, _pod: string) =>
      recallMemory(q, { workspaceId: ws, limit: 30 }).then((results) =>
        results
          .filter((r) => r.content?.trim())
          .map((r) => ({
            id: r.id,
            title: r.content.length > 120 ? r.content.substring(0, 120) + "…" : r.content,
            profileSlug: "memory",
            updatedAt: r.createdAt,
            createdAt: r.createdAt,
            workspaceId: ws ?? null,
            properties: {},
          }))
      ),
    [query, wsId, options?.podKey ?? ""],
    {
      keepPreviousData: true,
      execute: allow && query.length > 0,
    }
  );
}

/**
 * Auto-routing — asks the pod's query-understanding door (POST
 * /knowledge/ask, aliasing the canonical /knowledge/search retrieval
 * classifier) what a query means, so the caller can pick a listing (typed
 * entity search, filtered to the inferred profile) vs. a semantic recall
 * without the user having to say which. `limit: 1` keeps this cheap — only
 * `understanding`/`routedTo` are used, not the substrate items themselves.
 *
 * Degrades to `{ mode: "keyword" }` (today's plain search) on ANY failure —
 * older pods, network hiccups, a malformed `understanding` — so a routing
 * miss never blocks or errors the actual search. `onError` swallows the
 * default failure toast: this is a silent best-effort hint, not a result.
 */
export function useQueryRouting(query: string, options?: { execute?: boolean; workspaceId?: string; podKey?: string }) {
  const allow = options?.execute !== false;
  const wsId = options?.workspaceId;
  return useCachedPromise(
    async (q: string, ws: string | undefined, _pod: string): Promise<QueryRoute> => {
      // parseOnly asks for JUST the understanding + routing (no substrate
      // retrieval) — cheaper, and all this hook reads. Built as a variable, not
      // an inline literal, so it compiles against a hub-rest-client whose
      // published `ask()` types predate `parseOnly`; old pods ignore the unknown
      // body field harmlessly, so this is safe before any redeploy.
      const askInput = { query: q, workspaceId: ws, limit: 1, parseOnly: true };
      const result = await ask(askInput);
      const understanding = result.understanding as QueryUnderstanding | undefined;
      const routedTo = Array.isArray(result.routedTo) ? result.routedTo : [];
      const profileSlug = understanding?.profileTypes?.[0];

      // Structured = a profile type was inferred. Aligned with relay/browser:
      // they key on profileTypes + confidence >= 0.5 (so non-enumerative
      // "acme people" filters everywhere); the routedTo signal stays as an
      // OR-fallback for payloads without a confidence.
      const confident =
        typeof understanding?.confidence === "number"
          ? understanding.confidence >= 0.5
          : routedTo.includes("structured");
      if (profileSlug && (confident || routedTo.includes("structured"))) {
        return { mode: "structured", profileSlug, cleanedQuery: understanding?.cleanedQuery };
      }
      if (routedTo.some((s) => s === "episodic" || s === "procedural")) {
        return { mode: "semantic" };
      }
      return { mode: "keyword" };
    },
    [query, wsId, options?.podKey ?? ""],
    {
      keepPreviousData: true,
      execute: allow && query.length > 0,
      onError: () => {
        // Best-effort routing hint — a failure here just means we fall back
        // to plain keyword search, never a user-facing error.
      },
    }
  );
}
