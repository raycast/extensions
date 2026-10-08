/**
 * Test helper: an `Http` that answers from fixtures by URL. HTTP is mocked at the `http()` boundary, so adapters run
 * their real schemas against fixture bodies. Only imported from *.test.ts files.
 */
import { ProviderError } from "../core/errors";
import { Http, HttpRequest } from "../core/http";

export type Route = {
  /** Matched against the full request URL. Strings must be contained in the URL. */
  match: string | RegExp;
  /** Response body, or a function of the URL. Throwing from the function simulates a failure. */
  body: unknown | ((url: string) => unknown);
};

export type FixtureHttp = Http & { calls: Array<{ url: string; headers?: Record<string, string>; body?: string }> };

export function fixtureHttp(routes: Route[]): FixtureHttp {
  const calls: FixtureHttp["calls"] = [];
  const fn = async <T>(request: HttpRequest<T>): Promise<T> => {
    calls.push({ url: request.url, headers: request.headers, body: request.body });
    const route = routes.find((r) =>
      typeof r.match === "string" ? request.url.includes(r.match) : r.match.test(request.url),
    );
    if (!route) {
      throw new ProviderError(request.source, "unknown", `No fixture for ${request.url}`, { status: 404 });
    }
    const body = typeof route.body === "function" ? (route.body as (url: string) => unknown)(request.url) : route.body;
    const parsed = request.schema.safeParse(body);
    if (!parsed.success) {
      throw new ProviderError(request.source, "schema", parsed.error.issues[0]?.message ?? "schema");
    }
    return parsed.data;
  };
  return Object.assign(fn, { calls }) as FixtureHttp;
}

/** Decodes a URL's query string so assertions can read `created[gte]` and friends. */
export function queryOf(url: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const query = url.split("?")[1] ?? "";
  for (const part of query.split("&")) {
    if (!part) continue;
    const [k, v = ""] = part.split("=");
    const key = decodeURIComponent(k ?? "");
    (result[key] ??= []).push(decodeURIComponent(v));
  }
  return result;
}
