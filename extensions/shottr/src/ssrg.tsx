import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "shottr://grab/window";
  await closeMainWindow();
  open(url);
}
