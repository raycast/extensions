import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "cleanshot://all-in-one";
  await closeMainWindow();
  open(url);
}
