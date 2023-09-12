import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "cleanshot://capture-window";
  open(url);
  await closeMainWindow();
}
