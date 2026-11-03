import { promises as fs } from "node:fs";
import path from "node:path";

export function isTorrentPath(filePath: string | undefined): boolean {
  return (
    typeof filePath === "string" &&
    path.extname(filePath).toLowerCase() === ".torrent"
  );
}

export async function readTorrentBase64(filePath: string): Promise<string> {
  if (!isTorrentPath(filePath)) {
    throw new Error("Please choose a .torrent file.");
  }
  const buffer = await fs.readFile(filePath);
  if (buffer.length === 0 || buffer[0] !== 0x64) {
    throw new Error(
      "The selected file does not look like a bencoded .torrent file.",
    );
  }
  return buffer.toString("base64");
}

export function torrentDisplayName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}
