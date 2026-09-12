import { vi } from "vitest";

// Routes are tried in order; anything unrouted 404s
export type Route = (url: URL) => unknown | undefined;

export const calls: string[] = [];

const respond = (body: unknown, status = 200) =>
  ({
    ok: status < 400,
    status,
    statusText: status === 404 ? "Not Found" : status === 403 ? "Forbidden" : "OK",
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

export const installFetch = (routes: Route[]) => {
  calls.length = 0;
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(String(input));
    calls.push(url.pathname + url.search);
    for (const route of routes) {
      const body = route(url);
      if (body !== undefined) return body instanceof Object && "ok" in body ? (body as Response) : respond(body);
    }
    return respond({ message: "no route" }, 404);
  });
};

export const rejects = (status: number) => respond({ message: "nope" }, status);

export const orgPage = (...slugs: string[]) => ({
  data: slugs.map((slug, i) => ({ id: String(i + 1), type: "org", attributes: { slug } })),
  meta: { next_cursor: null },
});

export const page = (data: unknown[], nextCursor: string | null = null) => ({
  data,
  included: [],
  meta: { next_cursor: nextCursor },
});

export const siteRow = (id: number, serverId: number, attributes: Record<string, unknown> = {}) => ({
  id: String(id),
  type: "sites",
  attributes: { name: `site-${id}.com`, status: "installed", deployment_status: null, ...attributes },
  relationships: { server: { data: { id: String(serverId), type: "servers" } } },
});

export const serverRow = (id: number, attributes: Record<string, unknown> = {}) => ({
  id: String(id),
  type: "servers",
  attributes: { name: `web-${id}`, slug: `web-${id}`, connection_status: "connected", ...attributes },
});
