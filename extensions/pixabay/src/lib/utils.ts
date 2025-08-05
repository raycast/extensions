import afs from "fs/promises";
import os from "os";

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export async function fileToBase64Image(filename: string): Promise<string> {
  const buff = await afs.readFile(filename);
  const base64data = buff.toString("base64");
  return `data:image/jpeg;base64,${base64data}`;
}

export function capitalizeFirstLetter(name: string): string {
  return name.replace(/^./, name[0].toUpperCase());
}

export function resolveFilepath(filename: string): string {
  if (filename.startsWith("~")) {
    const hd = os.homedir();
    return hd + filename.substring(1);
  }
  return filename;
}

export function splitTagString(text: string): string[] {
  return text.split(",").map((t) => t.trim());
}

const fmt = new Intl.NumberFormat("en", { notation: "compact" });

export function compactNumberFormat(num: number): string {
  return fmt.format(num);
}
