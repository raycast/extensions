import { beforeEach, describe, expect, it, vi } from "vitest";

const { readFile, stat, access } = vi.hoisted(() => ({
  readFile: vi.fn(),
  stat: vi.fn(),
  access: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  readFile,
  stat,
  access,
}));

import { uploadFile } from "./api";

describe("uploadFile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    stat.mockResolvedValue({ isFile: () => true, size: 5 });
    access.mockResolvedValue(undefined);
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
  it("rejects an oversized file before reading its contents or uploading", async () => {
    stat.mockResolvedValue({ isFile: () => true, size: 1_000_000_001 });
    await expect(uploadFile("/synthetic/large.bin", "24h")).rejects.toThrow("exceeds the 1 GB limit");
    expect(readFile).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects a file that grew after preflight before uploading", async () => {
    readFile.mockResolvedValue({ byteLength: 1_000_000_001 });
    await expect(uploadFile("/synthetic/grown.bin", "24h")).rejects.toThrow("exceeds the 1 GB limit");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends the documented fields with synthetic bytes", async () => {
    readFile.mockResolvedValue(Buffer.from("synthetic fixture"));
    vi.mocked(global.fetch).mockResolvedValue(new Response("https://litter.catbox.moe/example.txt"));
    await uploadFile("/synthetic/example.txt", "12h");
    const [endpoint, options] = vi.mocked(global.fetch).mock.calls[0];
    expect(endpoint).toBe("https://litterbox.catbox.moe/resources/internals/api.php");
    expect(options?.method).toBe("POST");
    const form = options?.body as FormData;
    expect(form.get("reqtype")).toBe("fileupload");
    expect(form.get("time")).toBe("12h");
    const file = form.get("fileToUpload") as File;
    expect(file.name).toBe("example.txt");
    expect(await file.text()).toBe("synthetic fixture");
  });

  it("surfaces service errors", async () => {
    readFile.mockResolvedValue(Buffer.from("synthetic fixture"));
    vi.mocked(global.fetch).mockResolvedValue(new Response("Unavailable", { status: 503 }));
    await expect(uploadFile("/synthetic/example.txt", "24h")).rejects.toThrow("503");
  });
});
