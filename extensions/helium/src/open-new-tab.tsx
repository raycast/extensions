import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  await closeMainWindow();
  // Open a new tab in Helium
  await open("chrome://new-tab-page/", "net.imput.helium");
}
