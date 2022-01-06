import { copyTextToClipboard, showHUD } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";

export default async () => {
  const uuid = uuidv4();
  await copyTextToClipboard(uuid);
  await showHUD(`✅ Copied new UUID: ${uuid}`);
};
