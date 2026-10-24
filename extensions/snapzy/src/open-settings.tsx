import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  await closeMainWindow();
  await open("snapzy://settings");
}
