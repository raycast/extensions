import { createHash } from "crypto";
import afs from "fs/promises";

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function sha256FromString(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function fileToBase64Image(filename: string): Promise<string> {
  const buff = await afs.readFile(filename);
  const base64data = buff.toString("base64");
  return `data:image/jpeg;base64,${base64data}`;
}
