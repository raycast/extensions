import { Clipboard, showHUD } from "@raycast/api";
import generateCuid from "cuid";

export default async () => {
  const cuid = generateCuid();
  await Clipboard.copy(cuid);
  await showHUD(`✅ Copied new CUID: ${cuid}`);
};
