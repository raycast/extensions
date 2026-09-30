import { beforeEach, describe, expect, it, vi } from "vitest";

const { readFile } = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  readFile,
}));

import { uploadFile } from "./api";

describe("uploadFile", () => {
  beforeEach(() => {
    readFile.mockReset();
    global.fetch = vi.fn();
  });

  it("reads the file asynchronously before uploading", async () => {
    readFile.mockResolvedValue(Buffer.from("hello"));
    vi.mocked(global.fetch).mockResolvedValue(
      new Response("https://litterbox.catbox.moe/example.txt", {
        status: 200,
      }),
    );

    const result = await uploadFile("/tmp/example.txt", "24h");

    expect(readFile).toHaveBeenCalledWith("/tmp/example.txt");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toBe("https://litterbox.catbox.moe/example.txt");
  });
});
