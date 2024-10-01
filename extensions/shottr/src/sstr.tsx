import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "shottr://show";
  await closeMainWindow();
  open(url);
}
