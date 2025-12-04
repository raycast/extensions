import { open } from "@raycast/api";

export type Input = {
  url: string;
};

export default async function ({ url }: Input) {
  if (!url || url.length === 0) {
    throw new Error("url is required");
  }
  await open(url);
  return { ok: true, url };
}
