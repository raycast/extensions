import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "cleanshot://scrolling-capture";
  await closeMainWindow();
  open(url);
}
