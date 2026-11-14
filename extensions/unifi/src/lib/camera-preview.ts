import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

function isJpeg(snapshot: Buffer): boolean {
  return snapshot.length > JPEG_SIGNATURE.length && snapshot.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE);
}

export async function cameraPreviewMarkdown({
  cameraId,
  directory,
  snapshot,
}: {
  cameraId: string;
  directory: string;
  snapshot: Buffer;
}): Promise<string> {
  if (!isJpeg(snapshot)) throw new Error("Protect returned an invalid camera snapshot.");

  await mkdir(directory, { recursive: true });
  const cameraKey = createHash("sha256").update(cameraId).digest("hex").slice(0, 16);
  const filePath = path.join(directory, `protect-camera-${cameraKey}.jpg`);
  await writeFile(filePath, snapshot);

  return `![Camera snapshot](${encodeURI(filePath)}?raycast-width=900&snapshot=${Date.now()})`;
}
