import { showHUD } from "@raycast/api";
import { openTool } from "./utils";

export default async function Command() {
  await openTool("time-format");
}
