import { Clipboard, showHUD } from "@raycast/api";
import { nanoid } from "nanoid";

export default async () => {
  const id = nanoid();
  await Clipboard.copy(id);
  await showHUD(`✅ Copied ${id}`);
};
