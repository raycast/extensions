import { showHUD, getFrontmostApplication } from "@raycast/api";
import { close } from "swift:../swift/MyExecutable";

export default async function main() {
  const frontMostApp = await getFrontmostApplication();

  await close();

  await showHUD("Closing all apps except: " + frontMostApp.name);
}
