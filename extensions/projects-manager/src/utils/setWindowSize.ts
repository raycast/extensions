import { WindowManagement } from "@raycast/api";
import { waitUntilAppIsOpen } from "./waitUntilAppOpen";

export async function setWindowSize(appPath: string) {
  console.log("Setting window size for", appPath);
  waitUntilAppIsOpen(appPath, async () => {
    console.log("App is open");
    const desktops = await WindowManagement.getDesktops();
    console.log("Desktops", desktops);
    // setTimeout(() => {

    // }, 1000);
  });
}
