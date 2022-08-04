import { open } from "@raycast/api";

export async function createDocFromUrl(prefix: string, title?: string) {
  const baseUrl = `https://docs.google.com/${prefix}/create`;
  const url = title ? `${baseUrl}?title=${encodeURI(title)}` : baseUrl;

  await open(url);
}
