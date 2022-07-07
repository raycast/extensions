import { pasteText, closeMainWindow, copyTextToClipboard, showHUD } from "@raycast/api";

import { generateEmail } from "./utils";

export default async () => {
  const email = generateEmail();

  await pasteText(email);
  await copyTextToClipboard(email);
  await showHUD(`✅ Copied: ${email}`);
  await closeMainWindow();
};
