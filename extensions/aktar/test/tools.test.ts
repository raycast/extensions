import { describe, expect, it, vi } from "vitest";

// Right-to-left override, built at runtime so no raw text-direction character sits in the source.
const RLO = String.fromCharCode(0x202e);

vi.mock("../src/lib/format", () => ({ formatBytes: (bytes: number) => `${bytes} B` }));
vi.mock("../src/lib/destinations", () => ({
  findDestination: async () => ({ id: "d1", name: "Main", bucket: "files" }),
}));
vi.mock("../src/api/client", () => ({
  listObjects: async () => ({
    prefix: "docs/",
    folders: [{ prefix: "docs/a\nb/" }],
    objects: [{ key: `docs/report${RLO}.txt`, size: 10, lastModified: null, url: "https://files.example.com/x" }],
    nextContinuationToken: null,
  }),
  listUploads: async () => [
    {
      filename: `report${RLO}.txt`,
      objectKey: `docs/report${RLO}.txt`,
      url: "https://files.example.com/x",
      formats: { markdown: "[report](https://files.example.com/x)" },
      destinationName: "Main",
      size: 10,
      createdAt: "2026-10-09T00:00:00Z",
      expiresAt: null,
    },
  ],
}));

const listBucketFiles = (await import("../src/tools/list-bucket-files")).default;
const searchUploads = (await import("../src/tools/search-uploads")).default;

describe("AI tools keep exact identifiers", () => {
  it("returns keys and prefixes unchanged, with cleaned names beside them", async () => {
    const result = await listBucketFiles({});
    expect(result.folders).toEqual([{ prefix: "docs/a\nb/", name: "docs/a?b/" }]);
    expect(result.files[0].key).toBe(`docs/report${RLO}.txt`);
    expect(result.files[0].name).toBe("docs/report?.txt");
  });

  it("returns an upload's exact key and a cleaned file name", async () => {
    const result = await searchUploads({});
    expect(result.uploads[0].key).toBe(`docs/report${RLO}.txt`);
    expect(result.uploads[0].filename).toBe("report?.txt");
  });
});
