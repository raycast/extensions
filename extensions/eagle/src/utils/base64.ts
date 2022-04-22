import { open, readFile } from "fs/promises";

export async function fromPathToBase64Url(path: string, ext: string) {
  const file = await open(path, "r");
  const buffer = await readFile(file);
  const base64Url = `data:image/${ext};base64,${buffer.toString("base64")}`;
  return base64Url;
}
