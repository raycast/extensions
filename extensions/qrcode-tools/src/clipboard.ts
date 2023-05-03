import { Clipboard } from "@raycast/api";

export async function readFileURL(): Promise<string | undefined> {
  const { file } = await Clipboard.read();
  return file ? decodeURIComponent(file) : undefined;
}

export async function readText(): Promise<string> {
  const { text } = await Clipboard.read();
  return text;
}
