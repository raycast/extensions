import { showHUD, getFrontmostApplication } from "@raycast/api";
import { quitButFront } from "swift:../QuitAllButFocused";

export default async function main() {
  const frontMostApp = await getFrontmostApplication();

  await quitButFront();

  await showHUD("Closing all apps except: " + frontMostApp.name);
}
