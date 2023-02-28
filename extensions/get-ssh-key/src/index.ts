import { showHUD } from "@raycast/api";
import { exec } from "child_process";

export default async function main() {
  await exec("cat ~/.ssh/id_*.pub | pbcopy");
  await showHUD("Copied ssh to clipboard");
}
