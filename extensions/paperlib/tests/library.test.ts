import { describe, expect, it } from "vitest";

import { createApiClient, type HttpClient } from "../src/lib/client";
import { searchLibrary } from "../src/lib/library";
import { normalizePaper } from "../src/lib/normalize";
import { buildPaperlibQuery } from "../src/lib/query";
import type { LibraryPreferences } from "../src/lib/types";
import { DEMO_PAPERS } from "../src/lib/demo-library";

const SAMPLE = [
  {
    _id: "abc123",
    title: "Attention Is All You Need",
    authors: "Ashish Vaswani, Noam Shazeer",
    note: "Transformer architecture",
    publication: "NeurIPS",
    pubTime: "2017",
    pubType: 1,
    doi: "10.48550/arXiv.1706.03762",
    arxiv: "1706.03762",
    mainURL: "",
    publisher: "",
    pages: "5998-6008",
    volume: "30",
    number: "",
    rating: 5,
    flag: true,
    tags: [{ name: "transformers" }],
    folders: [],
    codes: [],
  },
];

describe("Paperlib API Host client", () => {
  it("calls paperService.load with a Paperlib query sentence", async () => {
    let requested: string | undefined;
    const http = fakeHttp((url) => {
      requested = url;
      return url.endsWith("/") ? "Paperlib APIHost Extension is running." : JSON.stringify(SAMPLE);
    });

    const client = createApiClient("http://paperlib.test", http);
    const papers = await client.searchPapers("attention", 10);

    expect(papers).toHaveLength(1);
    expect(papers[0].title).toBe("Attention Is All You Need");
    expect(papers[0].abstract).toBe("");
    expect(requested).toContain("/PLAPI.paperService.load/");
    const args = JSON.parse(decodeURIComponent(requested!.split("?args=")[1])) as unknown[];
    expect(args[0]).toBe(buildPaperlibQuery("attention", 10));
    expect(args[1]).toBe("addTime");
    expect(args[2]).toBe("desc");
  });

  it("reports the host unavailable when Paperlib is closed", async () => {
    const client = createApiClient("http://127.0.0.1:9");
    await expect(client.isAvailable()).resolves.toBe(false);
  });

  it("retries without LIMIT on Paperlib versions that reject it", async () => {
    const requests: string[] = [];
    const client = createApiClient(
      "http://paperlib.test",
      fakeHttp((url) => {
        requests.push(url);
        return url.includes("LIMIT") ? { ok: false, text: "Invalid filter" } : JSON.stringify(SAMPLE);
      }),
    );

    await expect(client.searchPapers("attention", 10)).resolves.toHaveLength(1);
    expect(requests).toHaveLength(2);
    expect(decodeURIComponent(requests[1])).not.toContain("LIMIT");
  });
});

describe("normalization", () => {
  it("does not treat false CSV flag values as true", () => {
    expect(normalizePaper({ title: "Unflagged", flag: "false" }).flag).toBe(false);
    expect(normalizePaper({ title: "Unflagged", flag: "0" }).flag).toBe(false);
    expect(normalizePaper({ title: "Flagged", flag: "true" }).flag).toBe(true);
  });
});

describe("searchLibrary", () => {
  const prefs: LibraryPreferences = {
    apiHost: "http://127.0.0.1:21227",
    useDemoFallback: true,
    fetchRemoteAbstracts: false,
    citationStyle: "apa",
    resultLimit: 20,
  };

  it("uses the live API host when Paperlib is running", async () => {
    const apiClient = createApiClient(
      "http://paperlib.test",
      fakeHttp((url) => {
        if (url.endsWith("/")) return "Paperlib APIHost Extension is running.";
        if (url.includes("preferenceService.get")) return JSON.stringify("/Users/me/Documents/paperlib");
        return JSON.stringify(SAMPLE);
      }),
    );

    const result = await searchLibrary("attention", prefs, { apiClient });
    expect(result.source).toBe("api");
    expect(result.papers[0].authors).toContain("Vaswani");
    expect(result.libraryFolder).toBe("/Users/me/Documents/paperlib");
  });

  it("falls back to a local JSON export", async () => {
    const fs = memoryFs({
      "/tmp/library.json": JSON.stringify([
        {
          title: "Local Only Paper",
          authors: "Ada Lovelace",
          doi: "10.1234/local",
          pubTime: "1843",
          publication: "Notes",
        },
      ]),
    });

    const result = await searchLibrary(
      "lovelace",
      {
        ...prefs,
        apiHost: "http://127.0.0.1:9",
        localLibraryFile: "/tmp/library.json",
        useDemoFallback: false,
      },
      { fs },
    );

    expect(result.source).toBe("local");
    expect(result.papers).toHaveLength(1);
    expect(result.papers[0].title).toBe("Local Only Paper");
  });

  it("falls back to the demo library when Paperlib is offline", async () => {
    const result = await searchLibrary("residual", {
      ...prefs,
      apiHost: "http://127.0.0.1:9",
    });

    expect(result.source).toBe("demo");
    expect(result.papers.some((paper) => /residual/i.test(paper.title))).toBe(true);
    expect(result.papers.length).toBeLessThanOrEqual(DEMO_PAPERS.length);
  });

  it("explains a Realm-only library folder instead of pretending to read it", async () => {
    const fs = memoryFs({}, { "/data/paperlib": ["default.realm", "pdfs"] });

    await expect(
      searchLibrary(
        "anything",
        {
          ...prefs,
          apiHost: "http://127.0.0.1:9",
          libraryFolder: "/data/paperlib",
          useDemoFallback: false,
        },
        { fs, env: {} },
      ),
    ).rejects.toThrow(/default\.realm/);
  });
});

function fakeHttp(reply: (url: string) => string | { ok: boolean; text: string }): HttpClient {
  return {
    async fetch(url) {
      const result = reply(url);
      const response = typeof result === "string" ? { ok: true, text: result } : result;
      return { ok: response.ok, status: response.ok ? 200 : 500, text: async () => response.text };
    },
  };
}

function memoryFs(files: Record<string, string>, dirs: Record<string, string[]> = {}) {
  return {
    async readFile(path: string) {
      if (!(path in files)) {
        throw new Error(`ENOENT: ${path}`);
      }
      return files[path];
    },
    async readdir(path: string) {
      if (!(path in dirs)) {
        throw new Error(`ENOENT: ${path}`);
      }
      return dirs[path];
    },
    async stat(path: string) {
      if (path in files) {
        return { isFile: () => true, isDirectory: () => false };
      }
      if (path in dirs) {
        return { isFile: () => false, isDirectory: () => true };
      }
      throw new Error(`ENOENT: ${path}`);
    },
  };
}
