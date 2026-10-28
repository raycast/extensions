import { describe, expect, it, vi } from "vitest";
import type { Upload } from "../src/api/types";

const upload = (fields: Partial<Upload>): Upload =>
  ({
    id: "u1",
    filename: "a.png",
    objectKey: "2026/a.png",
    url: "https://files.example.com/2026/a.png",
    destinationId: "d1",
    destinationName: "Main",
    shortUrl: null,
    ...fields,
  }) as Upload;

const uploads: Upload[] = [];
const created = vi.fn(async (id: string) => ({
  shortLink: {
    shortUrl: "https://s.example.com/x",
    targetUrl: "https://files.example.com/2026/a.png",
    providerName: "Shlink",
  },
  upload: {
    ...uploads.find((candidate) => candidate.id === id),
    formats: { markdown: "[a](https://s.example.com/x)" },
  },
}));

vi.mock("../src/lib/destinations", () => ({
  findDestination: async () => ({ id: "d1", name: "Main", bucket: "files" }),
}));
vi.mock("../src/api/client", () => ({
  listUploads: async ({ destinationId }: { destinationId?: string }) =>
    uploads.filter((candidate) => !destinationId || candidate.destinationId === destinationId),
  createShortLink: created,
}));

const { moveStatusNote, shareLink, shortLinkWarning } = await import("../src/lib/short-links");
const createShortLinkTool = await import("../src/tools/create-short-link");

describe("short link helpers", () => {
  it("shares the short link when there is one", () => {
    expect(shareLink(upload({}))).toBe("https://files.example.com/2026/a.png");
    expect(shareLink(upload({ shortUrl: "https://s.example.com/x" }))).toBe("https://s.example.com/x");
  });

  it("warns only about uploads whose short link failed", () => {
    expect(shortLinkWarning([upload({})])).toBeUndefined();
    expect(shortLinkWarning([upload({ shortLinkError: "HTTP 500" })])).toContain("HTTP 500");
    expect(shortLinkWarning([upload({}), upload({ shortLinkError: "HTTP 500" })])).toMatch(/^1 file has no short link/);
  });

  it("flags moves that left a short link behind", () => {
    expect(moveStatusNote("none")).toBeUndefined();
    expect(moveStatusNote("updated")?.warning).toBe(false);
    expect(moveStatusNote("orphaned")?.warning).toBe(true);
    expect(moveStatusNote("notUpdated")?.warning).toBe(true);
  });
});

describe("create-short-link tool", () => {
  it("only uses an upload whose key matches exactly", async () => {
    uploads.splice(0, uploads.length, upload({ id: "u1", objectKey: "2026/a.png.bak" }), upload({ id: "u2" }));
    const result = await createShortLinkTool.default({ key: "2026/a.png" });
    expect(created).toHaveBeenLastCalledWith("u2");
    expect(result.shortUrl).toBe("https://s.example.com/x");
  });

  it("keeps a leading slash or space that is part of the stored key", async () => {
    uploads.splice(
      0,
      uploads.length,
      upload({ id: "u1" }),
      upload({ id: "u2", objectKey: "/2026/a.png" }),
      upload({ id: "u3", objectKey: " 2026/a.png" }),
    );
    await createShortLinkTool.default({ key: "/2026/a.png" });
    expect(created).toHaveBeenLastCalledWith("u2");
    await createShortLinkTool.default({ key: " 2026/a.png" });
    expect(created).toHaveBeenLastCalledWith("u3");
    await createShortLinkTool.default({ key: "2026/a.png" });
    expect(created).toHaveBeenLastCalledWith("u1");
  });

  it("asks for a destination when the key is in several", async () => {
    uploads.splice(0, uploads.length, upload({ id: "u1" }), upload({ id: "u2", destinationId: "d2" }));
    await expect(createShortLinkTool.default({ key: "2026/a.png" })).rejects.toThrow(/several destinations/);
    await createShortLinkTool.default({ key: "2026/a.png", destination: "Main" });
    expect(created).toHaveBeenLastCalledWith("u1");
  });

  it("skips the confirmation when the upload already has a short link", async () => {
    uploads.splice(0, uploads.length, upload({ shortUrl: "https://s.example.com/x" }));
    expect(await createShortLinkTool.confirmation({ key: "2026/a.png" })).toBeUndefined();
    uploads.splice(0, uploads.length, upload({}));
    expect(await createShortLinkTool.confirmation({ key: "2026/a.png" })).toMatchObject({
      info: [{ value: "2026/a.png" }, { value: "Main" }],
    });
  });
});
