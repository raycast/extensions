import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "cleanshot://record-screen";
  await closeMainWindow();
  open(url);
}
