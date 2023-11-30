import { showHUD, getFrontmostApplication } from "@raycast/api";
import { close } from "swift:../swift/MyExecutable";

export default async function main() {
  const frontMostApp = await getFrontmostApplication();

  close();

  await showHUD("Frontmost App: " + frontMostApp.name);
}
