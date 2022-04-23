import { open, readFile } from "fs/promises";

/**
 * It takes a path to a file and an extension, and returns a base64 encoded string.
 * @param {string} path - The path to the file you want to convert.
 * @param {string} ext - The file extension of the file you want to convert.
 */
export async function fromPathToBase64Url(path: string, ext: string) {
  const file = await open(path, "r");
  const buffer = await readFile(file);
  const base64Url = `data:image/${ext};base64,${buffer.toString("base64")}`;
  await file.close();
  return base64Url;
}
