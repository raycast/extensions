import { Clipboard, showHUD } from "@raycast/api";

export default async () => {
  const utcTime = new Date().toISOString();

  await Clipboard.copy(utcTime);

  await showHUD(`✅ ${utcTime} copied to clipboard`);
};
