import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import { createApiClient } from "../src/lib/client";
import { searchLibrary } from "../src/lib/library";
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
  const servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
          }),
      ),
    );
  });

  it("calls paperService.load with a Paperlib query sentence", async () => {
    let requested: string | undefined;
    const host = await listen((req, res) => {
      requested = req.url;
      if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Paperlib APIHost Extension is running.");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(SAMPLE));
    });
    servers.push(host.server);

    const client = createApiClient(host.url);
    const papers = await client.searchPapers("attention");

    expect(papers).toHaveLength(1);
    expect(papers[0].title).toBe("Attention Is All You Need");
    expect(papers[0].abstract).toBe("Transformer architecture");
    expect(requested).toContain("/PLAPI.paperService.load/");
    const args = JSON.parse(decodeURIComponent(requested!.split("?args=")[1])) as unknown[];
    expect(args[0]).toBe(buildPaperlibQuery("attention"));
    expect(args[1]).toBe("addTime");
    expect(args[2]).toBe("desc");
  });

  it("reports the host unavailable when Paperlib is closed", async () => {
    const client = createApiClient("http://127.0.0.1:9");
    await expect(client.isAvailable()).resolves.toBe(false);
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
    const host = await listen((req, res) => {
      if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Paperlib APIHost Extension is running.");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.url?.includes("preferenceService.get")) {
        res.end(JSON.stringify("/Users/me/Documents/paperlib"));
        return;
      }
      res.end(JSON.stringify(SAMPLE));
    });

    try {
      const result = await searchLibrary("attention", { ...prefs, apiHost: host.url });
      expect(result.source).toBe("api");
      expect(result.papers[0].authors).toContain("Vaswani");
      expect(result.libraryFolder).toBe("/Users/me/Documents/paperlib");
    } finally {
      await closeServer(host.server);
    }
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

    const result = await searchLibrary("lovelace", {
      ...prefs,
      apiHost: "http://127.0.0.1:9",
      localLibraryFile: "/tmp/library.json",
      useDemoFallback: false,
    }, { fs });

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
      searchLibrary("anything", {
        ...prefs,
        apiHost: "http://127.0.0.1:9",
        libraryFolder: "/data/paperlib",
        useDemoFallback: false,
      }, { fs, env: {} }),
    ).rejects.toThrow(/default\.realm/);
  });
});

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

async function listen(handler: Parameters<typeof createServer>[0]) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${address.port}` };
}

function closeServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
