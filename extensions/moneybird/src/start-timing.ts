import { showHUD, LocalStorage } from "@raycast/api";

export default async function main() {
  const now = new Date();
  await LocalStorage.setItem("startTime", now.toISOString());
  await showHUD("Timing started at: " + now.toLocaleString());
}
