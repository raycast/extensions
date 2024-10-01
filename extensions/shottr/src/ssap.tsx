import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "shottr://grab/append";
  await closeMainWindow();
  open(url);
}
