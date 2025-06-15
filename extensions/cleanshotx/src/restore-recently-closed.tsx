import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "cleanshot://restore-recently-closed";
  await closeMainWindow();
  open(url);
}
