import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "shottr://uploads";
  await closeMainWindow();
  open(url);
}
