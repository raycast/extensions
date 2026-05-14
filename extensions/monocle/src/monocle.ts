import { open, showHUD } from "@raycast/api";

export async function monocle(path: string, message: string) {
  await open(`monocle://${path}`);
  await showHUD(message);
}
