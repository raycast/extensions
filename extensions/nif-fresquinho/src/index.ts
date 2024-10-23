import { showHUD, Clipboard } from "@raycast/api";
import { getNif } from "./nif";

export default async function main() {
  const newnif = getNif("20000000|29999999");

  await Clipboard.copy(newnif);
  await Clipboard.paste(newnif);
  await showHUD(`👋 Copied ${newnif} to clipboard`);
}
