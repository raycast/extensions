import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "cleanshot://self-timer";
  open(url);
  await closeMainWindow();
}
