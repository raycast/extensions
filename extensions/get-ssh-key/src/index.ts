import { showHUD } from "@raycast/api";
import { exec } from "child_process";

export default async function main() {
  await exec("cat $(find ~/.ssh/ -maxdepth 1 -name \"*.pub\" -print -quit) | pbcopy");
  await showHUD("Copied ssh key to clipboard");
}
