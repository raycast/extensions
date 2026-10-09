import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parseBackendQuery, searchBackend, type BackendSearchDeps } from "./backends";
import { MiseExitError, MiseOutputError } from "./exec";
import type { RemoteVersion } from "./remote";
import cargoFixture from "./fixtures/cargo-search.json";
import gemFixture from "./fixtures/gem-search.json";
import lsRemoteFixture from "./fixtures/ls-remote.json";
import npmFixture from "./fixtures/npm-search.json";

const missingStderr = readFileSync(join(__dirname, "fixtures/ls-remote-missing-stderr.txt"), "utf8");

function deps(overrides: Partial<BackendSearchDeps> = {}): BackendSearchDeps {
  return {
    fetch: vi.fn(async () => new Response("null")),
    listRemote: vi.fn(async () => [] as RemoteVersion[]),
    ...overrides,
  };
}

function fetchReturning(body: unknown, init?: ResponseInit): BackendSearchDeps["fetch"] {
  return vi.fn(async () => new Response(JSON.stringify(body), init));
}

describe("parseBackendQuery", () => {
  it("splits a known backend prefix from the query", () => {
    expect(parseBackendQuery("npm:prettier")).toEqual({ backend: "npm", query: "prettier" });
    expect(parseBackendQuery("  cargo: ripgrep ")).toEqual({ backend: "cargo", query: "ripgrep" });
  });

  it("keeps the slash in owner/repo names", () => {
    expect(parseBackendQuery("github:cli/cli")).toEqual({ backend: "github", query: "cli/cli" });
  });

  it("returns undefined for an unknown prefix, no prefix, or an empty query", () => {
    expect(parseBackendQuery("brew:jq")).toBeUndefined();
    expect(parseBackendQuery("prettier")).toBeUndefined();
    expect(parseBackendQuery("npm:")).toBeUndefined();
    expect(parseBackendQuery("npm:   ")).toBeUndefined();
    expect(parseBackendQuery("")).toBeUndefined();
  });
});

describe("searchBackend", () => {
  it("searches the npm registry and maps packages to specs", async () => {
    const fetch = fetchReturning(npmFixture);
    const results = await searchBackend("npm", "prettier", deps({ fetch }));
    expect(fetch).toHaveBeenCalledWith("https://registry.npmjs.org/-/v1/search?text=prettier&size=20", {
      headers: undefined,
    });
    expect(results.map((r) => r.spec)).toEqual([
      "npm:prettier",
      "npm:eslint-plugin-prettier",
      "npm:eslint-config-prettier",
    ]);
    expect(results[0]).toEqual({
      backend: "npm",
      spec: "npm:prettier",
      name: "prettier",
      description: "Prettier is an opinionated code formatter",
      version: "3.9.7",
      url: "https://www.npmjs.com/package/prettier",
    });
  });

  it("searches crates.io with a User-Agent and collapses multi-line descriptions", async () => {
    const fetch = fetchReturning(cargoFixture);
    const results = await searchBackend("cargo", "ripgrep", deps({ fetch }));
    expect(fetch).toHaveBeenCalledWith("https://crates.io/api/v1/crates?q=ripgrep&per_page=20", {
      headers: { "User-Agent": "raycast-mise" },
    });
    expect(results[0]).toEqual({
      backend: "cargo",
      spec: "cargo:ripgrep",
      name: "ripgrep",
      description:
        "ripgrep is a line-oriented search tool that recursively searches the current directory for a regex pattern while respecting gitignore rules. ripgrep has first class support on Windows, macOS and Linux.",
      version: "15.2.0",
      url: "https://crates.io/crates/ripgrep",
    });
  });

  it("searches rubygems and collapses the info text", async () => {
    const fetch = fetchReturning(gemFixture);
    const results = await searchBackend("gem", "rubocop", deps({ fetch }));
    expect(fetch).toHaveBeenCalledWith("https://rubygems.org/api/v1/search.json?query=rubocop", { headers: undefined });
    expect(results.map((r) => r.spec)).toEqual(["gem:rubocop", "gem:rubocop-ast", "gem:rubocop-performance"]);
    expect(results[0]).toEqual({
      backend: "gem",
      spec: "gem:rubocop",
      name: "rubocop",
      description:
        "RuboCop is a Ruby code style checking and code formatting tool. It aims to enforce the community-driven Ruby Style Guide.",
      version: "1.91.0",
      url: "https://rubygems.org/gems/rubocop",
    });
    expect(results[1].description).toBe("RuboCop's Node and NodePattern classes.");
  });

  it("URL-encodes the query", async () => {
    const fetch = fetchReturning({ objects: [] });
    await searchBackend("npm", "@scope/pkg", deps({ fetch }));
    expect(fetch).toHaveBeenCalledWith("https://registry.npmjs.org/-/v1/search?text=%40scope%2Fpkg&size=20", {
      headers: undefined,
    });
  });

  it("throws MiseOutputError when a search API changes shape", async () => {
    await expect(searchBackend("npm", "prettier", deps({ fetch: fetchReturning({ results: [] }) }))).rejects.toThrow(
      MiseOutputError,
    );
    await expect(searchBackend("cargo", "ripgrep", deps({ fetch: fetchReturning({ crates: [{}] }) }))).rejects.toThrow(
      /entry 0 is not a crate/,
    );
    await expect(searchBackend("gem", "rubocop", deps({ fetch: fetchReturning({}) }))).rejects.toThrow(MiseOutputError);
  });

  it("throws with the host and status on a non-2xx response", async () => {
    const fetch = fetchReturning({}, { status: 503 });
    await expect(searchBackend("cargo", "ripgrep", deps({ fetch }))).rejects.toThrow(
      /crates\.io responded with HTTP 503/,
    );
  });

  it("validates the exact spec through ls-remote for other backends and reports the newest version", async () => {
    const listRemote = vi.fn(async () => lsRemoteFixture);
    const results = await searchBackend("pipx", "black", deps({ listRemote }));
    expect(listRemote).toHaveBeenCalledWith("pipx:black", { signal: undefined });
    expect(results).toEqual([
      {
        backend: "pipx",
        spec: "pipx:black",
        name: "black",
        description: "",
        version: "1.8.2",
        url: "https://pypi.org/project/black",
      },
    ]);
  });

  it("links github specs to the repository and leaves other backends without a page", async () => {
    const listRemote = vi.fn(async () => [{ version: "2.101.0" }]);
    expect((await searchBackend("github", "cli/cli", deps({ listRemote })))[0].url).toBe("https://github.com/cli/cli");
    expect((await searchBackend("go", "github.com/x/y", deps({ listRemote })))[0].url).toBeUndefined();
  });

  it("returns no results when mise reports the package missing or lists no versions", async () => {
    const missing = vi.fn(async () => {
      throw new MiseExitError(["ls-remote", "pipx:this-does-not-exist-zz"], 1, missingStderr);
    });
    expect(await searchBackend("pipx", "this-does-not-exist-zz", deps({ listRemote: missing }))).toEqual([]);
    const notFound = vi.fn(async () => {
      throw new MiseExitError(["ls-remote", "npm:nope"], 1, "mise ERROR package not found: nope\n");
    });
    expect(await searchBackend("asdf", "nope", deps({ listRemote: notFound }))).toEqual([]);
    expect(await searchBackend("go", "example.invalid/nope", deps())).toEqual([]);
  });

  it("hands the abort signal to fetch and to listRemote", async () => {
    const { signal } = new AbortController();
    const fetch = fetchReturning({ objects: [] });
    await searchBackend("npm", "prettier", deps({ fetch, signal }));
    expect(fetch).toHaveBeenCalledWith(expect.any(String), { headers: undefined, signal });
    const listRemote = vi.fn(async () => [] as RemoteVersion[]);
    await searchBackend("pipx", "black", deps({ listRemote, signal }));
    expect(listRemote).toHaveBeenCalledWith("pipx:black", { signal });
  });

  it("rethrows other ls-remote failures", async () => {
    const rateLimited = vi.fn(async () => {
      throw new MiseExitError(
        ["ls-remote", "github:cli/cli"],
        1,
        "mise ERROR HTTP status client error (403 Forbidden)",
      );
    });
    await expect(searchBackend("github", "cli/cli", deps({ listRemote: rateLimited }))).rejects.toThrow(MiseExitError);
    const offline = vi.fn(async () => {
      throw new Error("spawn ENOENT");
    });
    await expect(searchBackend("ubi", "x/y", deps({ listRemote: offline }))).rejects.toThrow("spawn ENOENT");
  });
});
