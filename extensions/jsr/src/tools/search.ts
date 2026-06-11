import { onErrorCapture } from "@/lib/errors";
import { getOramaCreds } from "@/lib/getOramaCreds";
import { jsrUrls } from "@/lib/jsrUrls";
import { generateSearchBody } from "@/lib/searchBody";

type Input = {
  /**
   * The search term. Plain text such as "validation" or "fs helpers".
   */
  query: string;
  /**
   * Optional scope filter without the leading "@" (e.g. "std" matches `@std/*` only).
   */
  scope?: string;
  /**
   * Maximum number of results to return. Defaults to 10. Clamped to [1, 50].
   */
  limit?: number;
  /**
   * Optional runtime-compatibility filters. Set a field to `true` to restrict results to
   * packages compatible with that runtime. Combining multiple flags filters to packages
   * compatible with ALL selected runtimes.
   */
  runtimes?: {
    /** Filter to Node.js-compatible packages. */
    node?: boolean;
    /** Filter to Deno-compatible packages. */
    deno?: boolean;
    /** Filter to Bun-compatible packages. */
    bun?: boolean;
    /** Filter to browser-compatible packages. */
    browser?: boolean;
    /** Filter to Cloudflare Workers (workerd)-compatible packages. */
    workerd?: boolean;
  };
};

const runSearch = (apiKey: string, projectId: string, body: string) =>
  fetch(`https://collections.orama.com/v1/collections/${projectId}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

/**
 * Search packages on JSR.io (open-source package registry for JavaScript/TypeScript).
 * Returns matching packages with scope, name, description, score, runtime compatibility, and a link.
 */
export default async function tool(input: Input) {
  const query = (input.query ?? "").trim();
  if (!query) {
    throw new Error("Search query is empty");
  }
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);

  const body = generateSearchBody(query, input.scope ?? null, input.runtimes ?? {}, limit);

  let creds = await getOramaCreds();
  let res = await runSearch(creds.apiKey, creds.projectId, body);

  if (res.status === 401) {
    creds = await getOramaCreds(true);
    res = await runSearch(creds.apiKey, creds.projectId, body);
  }

  if (!res.ok) {
    const err = new Error(`JSR search failed: ${res.status} ${res.statusText}`);
    onErrorCapture(err);
    throw err;
  }

  const data = await res.json();
  if (data && typeof data === "object" && "message" in data) {
    throw new Error(`JSR search error: ${(data as { message: string }).message}`);
  }

  const typed = data as {
    count: number;
    hits: Array<{
      id: string;
      document: {
        id: string;
        scope: string;
        name: string;
        description: string;
        score?: number;
        runtimeCompat?: Record<string, boolean | undefined>;
      };
    }>;
  };

  const hits = typed.hits
    .filter((h) => !!h.id && !!h.document.id)
    .slice(0, limit)
    .map((h) => ({
      id: h.document.id,
      scope: h.document.scope,
      name: h.document.name,
      description: h.document.description,
      score: h.document.score,
      runtimeCompat: h.document.runtimeCompat,
      url: jsrUrls.site.package(h.document.id),
    }));

  return { count: typed.count, hits };
}
