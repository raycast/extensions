import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "shottr://grab/area";
  await closeMainWindow();
  open(url);
}
