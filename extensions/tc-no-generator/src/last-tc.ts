import { Clipboard, LocalStorage, showHUD, showToast } from "@raycast/api";
import { generator } from "./lib/generator";

export default async () => {
  let no = await LocalStorage.getItem("last-generate-tc");

  if (!no) {
    no = generator();
  }

  await Clipboard.copy(no as string);
  await showHUD(`✅ Copied ${no} to clipboard`);
};
