import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BooxClient, normalizeHost } from "../src/api/boox-client";
import { transferFiles } from "../src/operations/transfer";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BOOX client protocol", () => {
  it("preserves an explicitly configured HTTPS protocol", () => {
    expect(normalizeHost("https://reader.example:9443/path?token=ignored")).toBe("https://reader.example:8085");
    expect(normalizeHost("reader.local")).toBe("http://reader.local:8085");
    expect(new BooxClient("https://reader.example").screenHost).toBe("https://reader.example:8086");
  });

  it("defaults password-protected bare addresses to HTTPS and rejects explicit HTTP", () => {
    expect(new BooxClient("reader.local", "secret").host).toBe("https://reader.local:8085");
    expect(() => new BooxClient("http://reader.local", "secret")).toThrow(
      "BOOXDrop passwords require an HTTPS device address"
    );
  });

  it("keeps authenticated API requests on configured HTTPS transport", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await new BooxClient("https://reader.example", "secret").requirePing();

    expect(String(fetchMock.mock.calls[0][0])).toBe("https://reader.example:8085/api/ping");
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe("Basic OnNlY3JldA==");
  });

  it("uses libraryUniqueId and recognizes note folders", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        successful: true,
        data: {
          count: 1,
          folderCount: 1,
          list: [
            {
              dir: true,
              libraryModel: true,
              idString: "folder-id",
              library: { idString: "folder-id", name: "Research" },
            },
          ],
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const page = await new BooxClient("192.0.2.10").getNotes({ folderId: "folder-id" });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    const args = JSON.parse(requestUrl.searchParams.get("args") || "{}") as Record<string, unknown>;
    expect(args.libraryUniqueId).toBe("folder-id");
    expect(args).not.toHaveProperty("noteFolderId");
    expect(page.notes[0]).toMatchObject({ id: "folder-id", title: "Research", folder: true });
  });

  it("sends the selectedMap payload required to delete a directory", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ successful: true, data: null }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new BooxClient("192.0.2.10");

    await client.deleteStorage({
      dir: true,
      name: "Archive",
      path: "/storage/emulated/0/Documents/Archive",
      size: 0,
      updatedAt: 0,
    });

    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(init?.body))).toEqual({
      selectedMap: {
        "/storage/emulated/0/Documents": {
          count: 0,
          selectedAllMode: false,
          selectedList: ["/storage/emulated/0/Documents/Archive"],
        },
      },
    });
  });

  it("parses the human-readable storage sizes returned by the device", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ model: "Note Max", storageTotal: "128GB", storageUsed: "18.3GB" }))
      .mockResolvedValueOnce(new Response("screen", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const device = await new BooxClient("192.0.2.10").getDevice();

    expect(device.storageTotal).toBe(128 * 1024 ** 3);
    expect(device.storageUsed).toBe(18.3 * 1024 ** 3);
  });

  it("removes an incomplete download when the stream fails", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("partial"));
        controller.error(new Error("connection lost"));
      },
    });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(stream, { status: 200 })));
    const directory = await mkdtemp(path.join(os.tmpdir(), "boox-client-test-"));
    const destination = path.join(directory, "book.pdf");
    try {
      await expect(new BooxClient("192.0.2.10").downloadFile("/Download/book.pdf", destination)).rejects.toThrow();
      expect(existsSync(destination)).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("gives concurrent same-name downloads separate files", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("first", { status: 200 }))
      .mockResolvedValueOnce(new Response("second", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const directory = await mkdtemp(path.join(os.tmpdir(), "boox-client-test-"));
    const destination = path.join(directory, "book.pdf");
    try {
      const paths = await Promise.all([
        new BooxClient("192.0.2.10").downloadFile("/Download/book.pdf", destination),
        new BooxClient("192.0.2.10").downloadFile("/Download/book.pdf", destination),
      ]);
      expect(new Set(paths)).toEqual(new Set([destination, path.join(directory, "book (2).pdf")]));
      expect(paths.every(existsSync)).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("BOOX transfers", () => {
  it("rejects duplicate remote names before contacting the device", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "boox-transfer-test-"));
    const firstDirectory = path.join(directory, "first");
    const secondDirectory = path.join(directory, "second");
    await mkdir(firstDirectory);
    await mkdir(secondDirectory);
    const first = path.join(firstDirectory, "report.pdf");
    const second = path.join(secondDirectory, "report.pdf");
    await writeFile(first, "first");
    await writeFile(second, "second");
    const checkDuplicates = vi.fn().mockResolvedValue([]);
    try {
      await expect(
        transferFiles({
          client: { checkDuplicates } as unknown as BooxClient,
          paths: [first, second],
          mode: "storage",
          destination: "/Download",
          conflictPolicy: "skip",
        })
      ).rejects.toThrow("Multiple selected files are named report.pdf");
      expect(checkDuplicates).not.toHaveBeenCalled();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not report an uploaded library file as failed when index verification is unavailable", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "boox-transfer-test-"));
    const file = path.join(directory, "paper.pdf");
    await writeFile(file, "paper");
    const client = {
      checkDuplicates: vi.fn().mockResolvedValue([]),
      uploadLibrary: vi.fn().mockResolvedValue(undefined),
      getLibrary: vi.fn().mockRejectedValue(new Error("temporary network error")),
    } as unknown as BooxClient;
    try {
      const result = await transferFiles({
        client,
        paths: [file],
        mode: "library",
        conflictPolicy: "skip",
      });
      expect(result).toMatchObject({ uploaded: 1, failed: 0 });
      expect(result.items[0]).toMatchObject({ status: "uploaded", indexed: false });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
}
