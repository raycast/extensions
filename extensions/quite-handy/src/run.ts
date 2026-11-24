import { closeMainWindow, showHUD } from "@raycast/api";
import { execFile } from "child_process";

/// Opens a quitehandy:// link in the background: Quite Handy does it without coming to the front.
export async function run(path: string) {
  await closeMainWindow();
  await new Promise<void>((resolve) => {
    execFile("open", ["-g", `quitehandy://${path}`], async (error) => {
      if (error) {
        await showHUD("Quite Handy is not installed");
      }
      resolve();
    });
  });
}
