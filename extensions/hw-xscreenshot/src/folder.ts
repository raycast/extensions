import { homedir } from "node:os";
import { join } from "node:path";

export function screenshotFolder(saveFolder: string | undefined): string {
  return saveFolder || join(homedir(), "Pictures", "hw_raycast_xscreenshot");
}
