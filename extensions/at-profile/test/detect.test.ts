import { describe, expect, it } from "vitest";
import type { ProfileCheck } from "../src/catalog/types";
import { checkProfile } from "../src/helpers/detect";

interface Seen {
  url: string;
  method: string;
  redirect?: RequestRedirect;
  body?: string;
  headers: Record<string, string>;
}

/** A fetch that answers every request with one response and records what was asked */
function fakeFetch(respond: (url: string) => Response | Promise<Response>) {
  const seen: Seen[] = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    seen.push({
      url: String(input),
      method: init?.method ?? "GET",
      redirect: init?.redirect,
      body: typeof init?.body === "string" ? init.body : undefined,
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    return respond(String(input));
  };
  return { fetchImpl: fetchImpl as typeof fetch, seen };
}

const target = (check: ProfileCheck, usernamePattern?: string) => ({
  urlTemplate: "https://example.com/{profile}",
  check,
  usernamePattern,
});

describe("checkProfile", () => {
  it("skips the request when the username can't exist on the site", async () => {
    const { fetchImpl, seen } = fakeFetch(() => new Response("", { status: 200 }));
    const result = await checkProfile(target({ signals: ["status"] }, "^[a-z]+$"), "has space", { fetchImpl });
    expect(result.status).toBe("invalid");
    expect(seen).toHaveLength(0);
  });

  it("reads a 2xx as found and anything else as not found, with a HEAD request", async () => {
    const found = fakeFetch(() => new Response(null, { status: 200 }));
    expect((await checkProfile(target({ signals: ["status"] }), "example_user", found)).status).toBe("found");
    expect(found.seen[0]).toMatchObject({ url: "https://example.com/example_user", method: "HEAD" });

    const missing = fakeFetch(() => new Response(null, { status: 404 }));
    expect((await checkProfile(target({ signals: ["status"] }), "example_user", missing)).status).toBe("not-found");
  });

  it("treats a listed status as not found even when it is a 2xx", async () => {
    const { fetchImpl } = fakeFetch(() => new Response(null, { status: 204 }));
    const result = await checkProfile(target({ signals: ["status"], notFoundStatus: [204] }), "example_user", {
      fetchImpl,
    });
    expect(result.status).toBe("not-found");
  });

  it("reports rate limits and refusals as blocked rather than as not found", async () => {
    for (const status of [401, 403, 406, 429, 999]) {
      // Response refuses statuses past 599, and LinkedIn sends 999
      const { fetchImpl } = fakeFetch(() => ({ status, text: async () => "" }) as Response);
      expect((await checkProfile(target({ signals: ["status"] }), "example_user", { fetchImpl })).status).toBe(
        "blocked",
      );
    }
  });

  it("matches not-found text in the page body with a GET", async () => {
    const check: ProfileCheck = { signals: ["message"], notFoundText: ["No such user", "Page not found"] };
    const missing = fakeFetch(() => new Response("<h1>Page not found</h1>", { status: 200 }));
    expect((await checkProfile(target(check), "example_user", missing)).status).toBe("not-found");
    expect(missing.seen[0].method).toBe("GET");

    const found = fakeFetch(() => new Response("<h1>example_user</h1>", { status: 200 }));
    expect((await checkProfile(target(check), "example_user", found)).status).toBe("found");
  });

  it("reads a 404 or 410 as not found even on a text-matching check", async () => {
    // dribbble.com answered a missing profile with a 404 page that lacked the expected text (2026-11-09)
    const check: ProfileCheck = { signals: ["message"], notFoundText: ["Whoops, that page is gone."] };
    for (const status of [404, 410]) {
      const missing = fakeFetch(() => new Response("<h1>Not here</h1>", { status }));
      expect((await checkProfile(target(check), "example_user", missing)).status, String(status)).toBe("not-found");
    }
  });

  it("reads a server error as couldn't check, unless the page says the profile doesn't exist", async () => {
    const check: ProfileCheck = { signals: ["status", "message"], notFoundText: ["Could not resolve handle"] };
    const broken = fakeFetch(() => new Response("Internal error", { status: 503 }));
    expect((await checkProfile(target(check), "example_user", broken)).status).toBe("error");
    // Slingshot answers an unknown ATProto handle with a 500 that says so (2026-11-09)
    const missing = fakeFetch(() => new Response('{"message":"Could not resolve handle"}', { status: 500 }));
    expect((await checkProfile(target(check), "example_user", missing)).status).toBe("not-found");
  });

  it("matches a whole not-found body exactly, not as a substring", async () => {
    const check: ProfileCheck = { signals: ["message"], notFoundBody: "[]" };
    const empty = fakeFetch(() => new Response(" []\n", { status: 200 }));
    expect((await checkProfile(target(check), "example_user", empty)).status).toBe("not-found");

    const listed = fakeFetch(() => new Response('[{"id":1,"tags":[]}]', { status: 200 }));
    expect((await checkProfile(target(check), "example_user", listed)).status).toBe("found");
  });

  it("does not follow redirects for a redirect check, and reads a redirect as not found", async () => {
    const check: ProfileCheck = { signals: ["redirect"] };
    const redirected = fakeFetch(() => new Response(null, { status: 302, headers: { location: "/" } }));
    expect((await checkProfile(target(check), "example_user", redirected)).status).toBe("not-found");
    expect(redirected.seen[0].redirect).toBe("manual");

    const found = fakeFetch(() => new Response("profile", { status: 200 }));
    expect((await checkProfile(target(check), "example_user", found)).status).toBe("found");
  });

  it("requests the probe URL and fills the profile into it and the body", async () => {
    const { fetchImpl, seen } = fakeFetch(() => new Response(null, { status: 200 }));
    await checkProfile(
      target({
        signals: ["status"],
        probeUrl: "https://api.example.com/users?name={profile}",
        method: "POST",
        body: '{"username":"{profile}"}',
        headers: { "X-Test": "1" },
      }),
      "example_user",
      { fetchImpl },
    );
    expect(seen[0]).toMatchObject({
      url: "https://api.example.com/users?name=example_user",
      method: "POST",
      body: '{"username":"example_user"}',
    });
    expect(seen[0].headers["X-Test"]).toBe("1");
    expect(seen[0].headers["User-Agent"]).toMatch(/Mozilla/);
  });

  it("encodes the profile in the URL the same way buildProfileUrl does", async () => {
    const { fetchImpl, seen } = fakeFetch(() => new Response(null, { status: 200 }));
    await checkProfile(target({ signals: ["status"] }), "@a b", { fetchImpl });
    expect(seen[0].url).toBe("https://example.com/a%20b");
  });

  it("reports a bot-protection page as blocked", async () => {
    const { fetchImpl } = fakeFetch(
      () => new Response('<span id="challenge-error-text">Checking your browser</span>', { status: 200 }),
    );
    const result = await checkProfile(target({ signals: ["message"], notFoundText: ["missing"] }), "example_user", {
      fetchImpl,
    });
    expect(result.status).toBe("blocked");
  });

  it("reports a network failure and a timeout as errors", async () => {
    const failing = fakeFetch(() => Promise.reject(new TypeError("fetch failed")));
    const failed = await checkProfile(target({ signals: ["status"] }), "example_user", failing);
    expect(failed).toMatchObject({ status: "error", error: "fetch failed" });

    const hanging = fakeFetch(() => new Promise<Response>(() => undefined));
    const timedOut = await checkProfile(target({ signals: ["status"] }), "example_user", {
      fetchImpl: hanging.fetchImpl,
      timeoutMs: 20,
    });
    expect(timedOut).toMatchObject({ status: "error", error: "Timed out" });
  });

  it("throws when the caller cancels, so a canceled search reports nothing", async () => {
    const controller = new AbortController();
    const hanging = fakeFetch(() => new Promise<Response>(() => undefined));
    const pending = checkProfile(target({ signals: ["status"] }), "example_user", {
      fetchImpl: hanging.fetchImpl,
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toThrow();
  });
});
