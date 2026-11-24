import { closeMainWindow, open } from "@raycast/api";

export async function run(url: string) {
  await closeMainWindow();
  await open(url);
}
