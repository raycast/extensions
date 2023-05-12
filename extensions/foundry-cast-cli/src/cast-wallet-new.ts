import { Clipboard, showHUD } from "@raycast/api";

import { execCast } from "./lib/utils";

const successMessage = "Copied wallet info to clipboard";

export default async function Command() {
  const { stdout } = await execCast("wallet new", 1);
  Clipboard.copy(stdout);
  showHUD(successMessage);
}
