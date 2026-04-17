import { closeMainWindow, open, showHUD } from "@raycast/api";

export default async function Command() {
  await closeMainWindow();
  await open("deskpals://toggle");
  await showHUD("Toggled Deskpals visibility");
}
