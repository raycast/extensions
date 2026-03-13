import { copyTextToClipboard, showHUD } from "@raycast/api";

import { generateEmail } from "./utils";

export default async () => {
  const email = generateEmail();

  await copyTextToClipboard(email);
  await showHUD(`✅ Copied: ${email}`);
};
