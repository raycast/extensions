import { describe, expect, it, vi } from "vitest";
import { assertSecureUrl, buildUrl, createMealieClient, MealieError, normalizeBaseUrl } from "./client";

const config = { baseUrl: "https://mealie.example.org", token: "t0ken", allowInsecureHttp: false };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("normalizeBaseUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeBaseUrl("https://mealie.example.org/")).toBe("https://mealie.example.org");
    expect(normalizeBaseUrl("https://mealie.example.org///")).toBe("https://mealie.example.org");
  });

  it("strips a trailing /api because paths already carry it", () => {
    expect(normalizeBaseUrl("https://mealie.example.org/api")).toBe("https://mealie.example.org");
  });

  it("assumes https when no scheme is given", () => {
    expect(normalizeBaseUrl("mealie.example.org")).toBe("https://mealie.example.org");
  });

  it("rejects an empty value", () => {
    expect(() => normalizeBaseUrl("   ")).toThrow(MealieError);
  });
});

describe("assertSecureUrl", () => {
  it("accepts https", () => {
    expect(() => assertSecureUrl("https://mealie.example.org", false)).not.toThrow();
  });

  it("accepts http on localhost", () => {
    expect(() => assertSecureUrl("http://localhost:9000", false)).not.toThrow();
    expect(() => assertSecureUrl("http://127.0.0.1:9000", false)).not.toThrow();
  });

  it("refuses http elsewhere so the token is not sent in the clear", () => {
    expect(() => assertSecureUrl("http://mealie.example.org", false)).toThrow(/HTTPS/i);
  });

  it("allows http elsewhere once the user opted in", () => {
    expect(() => assertSecureUrl("http://mealie.example.org", true)).not.toThrow();
  });
});

describe("buildUrl", () => {
  it("appends query parameters and skips empty ones", () => {
    const url = buildUrl("https://mealie.example.org", "/api/recipes", { search: "pasta", page: 1, tags: undefined });
    expect(url).toBe("https://mealie.example.org/api/recipes?search=pasta&page=1");
  });
});

describe("createMealieClient", () => {
  it("sends the bearer token and parses JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "abc" }));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    const result = await client.get<{ id: string }>("/api/users/self");

    expect(result).toEqual({ id: "abc" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t0ken");
  });

  it("maps 401 to an auth error without leaking the token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ detail: "Not authenticated" }, 401));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    await expect(client.get("/api/users/self")).rejects.toMatchObject({ kind: "auth", status: 401 });
    await expect(client.get("/api/users/self")).rejects.not.toThrow(/t0ken/);
  });

  it("surfaces Mealie's own message on 400 so a failed import is explainable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ detail: "Could not parse recipe" }, 400));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    await expect(client.post("/api/recipes/create/url", { url: "x" })).rejects.toMatchObject({
      kind: "badRequest",
      message: "Could not parse recipe",
    });
  });

  it("maps a thrown fetch to a network error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("failed to fetch"));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    await expect(client.get("/api/users/self")).rejects.toMatchObject({ kind: "network" });
  });

  it("returns void for 204 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    await expect(client.del("/api/foods/1")).resolves.toBeUndefined();
  });

  it("walks every page in getAllPages", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [{ n: 1 }], page: 1, total: 2, total_pages: 2, next: "x" }))
      .mockResolvedValueOnce(jsonResponse({ items: [{ n: 2 }], page: 2, total: 2, total_pages: 2, next: null }));
    const client = createMealieClient(config, fetchMock as unknown as typeof fetch);

    await expect(client.getAllPages<{ n: number }>("/api/foods")).resolves.toEqual([{ n: 1 }, { n: 2 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
