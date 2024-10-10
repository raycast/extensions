import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "shottr://settings";
  await closeMainWindow();
  open(url);
}
