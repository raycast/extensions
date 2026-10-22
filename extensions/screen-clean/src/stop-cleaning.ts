import { showHUD } from "@raycast/api";
import { stopHelper } from "./lib/screen-cleaner";

export default async function main() {
  const stopped = await stopHelper();
  await showHUD(stopped ? "Cleaning mode stopped" : "Cleaning mode is not running");
}
