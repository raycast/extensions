import { Clipboard, showHUD } from "@raycast/api";
import { modules } from "./raycast/create-modules";

export default async function Command() {
  const password = await modules.passwords.generate({ length: 20, numbers: true, uppercase: true, symbols: true });
  await Clipboard.copy(password);
  await showHUD("Password generated and copied");
}
