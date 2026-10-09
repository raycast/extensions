import { closeMainWindow, open } from "@raycast/api";
import { appUrl } from "./lib/api";

export default async function Command() {
  await closeMainWindow();
  await open(appUrl("home"));
}
