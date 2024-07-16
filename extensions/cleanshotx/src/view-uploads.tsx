import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "https://cleanshot.cloud/";
  await closeMainWindow();
  open(url);
}
