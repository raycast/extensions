import { describe, expect, it, vi } from "vitest";

// One site answers only on its second try, so the sync's retry pass runs
const tries = new Map<string, number>();
vi.mock("../src/helpers/transport", () => ({
  siteFetch: async (input: string | URL) => {
    const url = String(input);
    if (url.startsWith("https://api.github.com/")) return Response.json({ sha: "abc123" });
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      const site = (name: string) => ({
        errorType: "status_code",
        url: `https://${name}.example/{}`,
        urlMain: `https://${name}.example/`,
        username_claimed: "example_user",
      });
      // Delta's username rules refuse the first nonsense name
      const delta = { ...site("delta"), regexCheck: "^[a-z]{1,12}$", username_claimed: "exampleuser" };
      return Response.json({ Alpha: site("alpha"), Beta: site("beta"), Gamma: site("gamma"), Delta: delta });
    }
    const count = (tries.get(url) ?? 0) + 1;
    tries.set(url, count);
    if (url.startsWith("https://beta.example/") && count === 1) throw new Error("Timed out");
    const known = url.endsWith("/example_user") || url.endsWith("/exampleuser");
    return new Response("", { status: known ? 200 : 404 });
  },
}));

const { buildCatalog } = await import("../src/catalog/sync");

describe("buildCatalog", () => {
  it("never moves the progress backwards, retry pass included, and ends at the total", async () => {
    const progress: [number, number][] = [];
    const catalog = await buildCatalog({ concurrency: 2, onProgress: (done, total) => progress.push([done, total]) });

    expect(catalog.sites.find((site) => site.name === "Beta")?.reliability).toBe("works");
    const done = progress.map(([count]) => count);
    expect(done).toEqual([...done].sort((a, b) => a - b));
    expect(progress.at(-1)).toEqual([4, 4]);
  });

  it("tests a site's 'no such profile' answer with a nonsense name its rules accept", async () => {
    const catalog = await buildCatalog({ concurrency: 2 });
    expect([...tries.keys()]).toContain("https://delta.example/zqxkvplmwq");
    expect(catalog.sites.find((site) => site.name === "Delta")?.reliability).toBe("works");
  });
});
