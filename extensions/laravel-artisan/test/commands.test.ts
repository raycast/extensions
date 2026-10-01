import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCommands, fetchVersions, searchCommands } from "../src/lib/commands";
import searchArtisanCommands from "../src/tools/search-artisan-commands";

// Raycast's Cache only exists inside Raycast, so a Map stands in for it
const store = vi.hoisted(() => new Map<string, string>());
vi.mock("@raycast/api", () => ({
  Cache: class {
    get = (key: string) => store.get(key);
    set = (key: string, value: string) => store.set(key, value);
  },
}));

const DAY = 24 * 60 * 60 * 1000;
const cacheEntry = (text: string, age: number) => JSON.stringify({ fetchedAt: Date.now() - age, text });

beforeEach(() => {
  store.clear();
  vi.restoreAllMocks();
});

// Live files from artisan-api's weekly build, so a change to their format fails here
describe("GitHub data", { timeout: 30_000 }, () => {
  it("lists the Laravel versions, newest first", async () => {
    const versions = await fetchVersions();
    expect(versions.length).toBeGreaterThan(0);
    for (const version of versions) expect(version).toMatch(/^\d+\.x$/);
    expect(versions).toEqual([...versions].sort((a, b) => parseInt(b) - parseInt(a)));
  });

  it("loads each version's commands in the shape the extension reads", async () => {
    for (const version of await fetchVersions()) {
      const commands = await fetchCommands(version);
      const names = commands.map(({ name }) => name);
      expect(names).toContain("migrate");
      expect(new Set(names).size).toBe(names.length);
      for (const command of commands) {
        expect(command.name).not.toMatch(/^_/);
        expect(command).toMatchObject({
          name: expect.any(String),
          description: expect.any(String),
          synopsis: expect.any(String),
          aliases: expect.any(Array),
        });
        for (const option of command.options) {
          expect(option).toMatchObject({
            name: expect.any(String),
            description: expect.any(String),
            value_required: expect.any(Boolean),
            value_optional: expect.any(Boolean),
          });
        }
        for (const argument of command.arguments) {
          expect(argument).toMatchObject({
            name: expect.any(String),
            description: expect.any(String),
            required: expect.any(Boolean),
          });
          expect([argument.default ?? ""].flat().every((value) => typeof value === "string")).toBe(true);
        }
      }
    }
  });
});

describe("search", { timeout: 30_000 }, () => {
  it("ranks an exact name first", async () => {
    const commands = await fetchCommands((await fetchVersions())[0]);
    expect(searchCommands(commands, "migrate")[0].name).toBe("migrate");
    expect(searchCommands(commands, "make:model")[0].name).toBe("make:model");
  });

  it("returns every command for an empty term", async () => {
    const commands = await fetchCommands((await fetchVersions())[0]);
    expect(searchCommands(commands, "  ")).toHaveLength(commands.length);
  });
});

describe("search-artisan-commands tool", { timeout: 30_000 }, () => {
  it("returns a command's usage, options, and arguments", async () => {
    const [newest] = await fetchVersions();
    const result = await searchArtisanCommands({ query: "make:model", version: newest.replace(".x", "") });
    expect(result.version).toBe(newest);
    const [command] = result.commands;
    expect(command).toMatchObject({ name: "make:model", usage: expect.stringMatching(/^php artisan make:model /) });
    expect(command).toHaveProperty(
      "options",
      expect.arrayContaining([expect.objectContaining({ name: "--migration", takesValue: false })]),
    );
    expect(command).toHaveProperty(
      "arguments",
      expect.arrayContaining([expect.objectContaining({ name: "name", required: true })]),
    );
  });

  it("leaves out an empty list default", async () => {
    const result = await searchArtisanCommands({ query: "queue:retry" });
    const command = result.commands.find(({ name }) => name === "queue:retry");
    expect(command).toHaveProperty(
      "arguments",
      expect.arrayContaining([expect.objectContaining({ name: "id", default: undefined })]),
    );
  });

  it("falls back to the newest version, with a warning", async () => {
    const versions = await fetchVersions();
    const result = await searchArtisanCommands({ query: "migrate", version: "5.x" });
    expect(result.version).toBe(versions[0]);
    expect(result.warnings).toContainEqual(expect.stringContaining("isn't available"));
  });

  it("warns when nothing matches", async () => {
    const result = await searchArtisanCommands({ query: "zzqqxxjj" });
    expect(result.commands).toEqual([]);
    expect(result.warnings).toEqual(['No Artisan command matched "zzqqxxjj".']);
  });

  it("lists every command's name and description for an empty query", async () => {
    const commands = await fetchCommands((await fetchVersions())[0]);
    const result = await searchArtisanCommands({});
    expect(result.commands).toEqual(commands.map(({ name, description }) => ({ name, description })));
    expect(result.warnings).toEqual([]);
  });

  it("says when a search matches more than ten commands, even an exact name", async () => {
    for (const query of ["make", "migrate"]) {
      const result = await searchArtisanCommands({ query });
      expect(result.commands).toHaveLength(10);
      expect(result.warnings).toEqual([expect.stringMatching(/^Showing the top 10 of \d+ matches/)]);
    }
  });
});

describe("cache", () => {
  it("uses a copy under a day old without fetching", async () => {
    store.set("index.ts", cacheEntry('"99.x": v99,', DAY / 2));
    const fetch = vi.spyOn(globalThis, "fetch");
    expect(await fetchVersions()).toEqual(["99.x"]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("replaces a copy over a day old", async () => {
    store.set("index.ts", cacheEntry('"99.x": v99,', DAY * 2));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('"14.x": v14,\n"13.x": v13,'));
    expect(await fetchVersions()).toEqual(["14.x", "13.x"]);
    expect(JSON.parse(store.get("index.ts") ?? "{}").fetchedAt).toBeGreaterThan(Date.now() - 1000);
  });

  it("keeps an old copy when the fetch fails", async () => {
    const entry = cacheEntry('"99.x": v99,', DAY * 2);
    store.set("index.ts", entry);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    expect(await fetchVersions()).toEqual(["99.x"]);
    expect(store.get("index.ts")).toBe(entry);
  });

  it("keeps an old copy when GitHub returns an error", async () => {
    const entry = cacheEntry('"99.x": v99,', DAY * 2);
    store.set("index.ts", entry);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    expect(await fetchVersions()).toEqual(["99.x"]);
    expect(store.get("index.ts")).toBe(entry);
  });

  it("keeps an old copy when the download breaks off", async () => {
    const entry = cacheEntry('"99.x": v99,', DAY * 2);
    store.set("index.ts", entry);
    const response = new Response('"14.x": v14,');
    vi.spyOn(response, "text").mockRejectedValue(new TypeError("terminated"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
    expect(await fetchVersions()).toEqual(["99.x"]);
    expect(store.get("index.ts")).toBe(entry);
  });

  it("keeps an old copy when the new file lists no versions", async () => {
    const entry = cacheEntry('"99.x": v99,', DAY * 2);
    store.set("index.ts", entry);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("export default {};"));
    expect(await fetchVersions()).toEqual(["99.x"]);
    expect(store.get("index.ts")).toBe(entry);
  });

  it("throws when the file lists no versions and nothing is cached", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(""));
    await expect(fetchVersions()).rejects.toThrow("Couldn't read the Laravel versions.");
    expect(store.size).toBe(0);
  });

  it("throws when offline with nothing cached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchVersions()).rejects.toThrow("Couldn't load the Laravel versions. Check your connection.");
    expect(store.size).toBe(0);
  });

  it("lists a command the file repeats once", async () => {
    const command = { name: "make:config", description: "", synopsis: "", aliases: [], arguments: [], options: [] };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([command, command])));
    expect(await fetchCommands("99.x")).toEqual([command]);
  });

  it("throws with the status when GitHub fails and nothing is cached", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 404 }));
    await expect(fetchCommands("99.x")).rejects.toThrow("Couldn't load the commands for Laravel 99.x (404).");
  });
});
