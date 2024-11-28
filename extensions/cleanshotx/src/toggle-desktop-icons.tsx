import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "cleanshot://toggle-desktop-icons";
  await closeMainWindow();
  open(url);
}
