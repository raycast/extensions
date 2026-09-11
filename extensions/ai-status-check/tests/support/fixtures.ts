import { readFile } from "node:fs/promises";

export async function jsonFixture(path: string): Promise<unknown> {
  return JSON.parse(await textFixture(path)) as unknown;
}

export function textFixture(path: string): Promise<string> {
  return readFile(`tests/fixtures/${path}`, "utf8");
}
