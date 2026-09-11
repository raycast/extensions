import { open } from "@raycast/api";

export type Input = {
  url: string;
};

export default async function ({ url }: Input) {
  if (!url) {
    throw new Error("url is required");
  }
  await open(url);
  return { ok: true, url };
}
