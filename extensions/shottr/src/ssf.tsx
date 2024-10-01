import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "shottr://load/file";
  await closeMainWindow();
  open(url);
}
