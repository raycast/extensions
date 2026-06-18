import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  await closeMainWindow();
  open("snapzy://capture/application");
}
