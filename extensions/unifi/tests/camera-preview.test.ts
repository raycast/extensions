import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cameraPreviewMarkdown } from "../src/lib/camera-preview";

describe("Protect camera preview", () => {
  it("writes a validated JPEG and returns file-backed Raycast markdown", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "unifi-camera-preview-"));
    const snapshot = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
    const markdown = await cameraPreviewMarkdown({ cameraId: "camera/1", directory, snapshot });
    const encodedPath = markdown.match(/^!\[Camera snapshot\]\((.*\.jpg)\?raycast-width=/)?.[1];

    expect(encodedPath).toBeTruthy();
    expect(markdown).not.toContain("data:image");
    await expect(readFile(decodeURI(encodedPath as string))).resolves.toEqual(snapshot);
  });

  it("rejects an empty or non-JPEG response", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "unifi-camera-preview-"));

    await expect(
      cameraPreviewMarkdown({ cameraId: "camera-1", directory, snapshot: Buffer.from("error") }),
    ).rejects.toThrow("invalid camera snapshot");
  });
});
