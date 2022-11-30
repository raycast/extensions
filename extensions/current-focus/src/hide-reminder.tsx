import { Cache, closeMainWindow } from "@raycast/api";

const cache = new Cache();

export default async function hideReminder() {
  cache.set("visible", "false");
  await closeMainWindow();
}
