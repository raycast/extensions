import { Clipboard, LocalStorage, showHUD, showToast } from "@raycast/api";
import { generator } from "./lib/generator";

export default async () => {
  const no = generator();
  await Clipboard.copy(no);

  await LocalStorage.setItem("last-generate-tc", no);
  await showHUD(`✅ Copied ${no} to clipboard`);
};
