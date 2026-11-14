import { mkdir } from "node:fs/promises";

import { getPreferenceValues, open } from "@raycast/api";

import { screenshotFolder } from "./folder.ts";

export default async function main() {
  const folder = screenshotFolder(getPreferenceValues<Preferences>().saveFolder);
  await mkdir(folder, { recursive: true });
  await open(folder);
}
