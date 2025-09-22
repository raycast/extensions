import { showHUD } from "@raycast/api";
import { openNewMeeting } from "./utils/deepLink";

export default async function main() {
  await openNewMeeting();
  await showHUD("Opening Circleback");
}
