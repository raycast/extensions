import { Clipboard, LocalStorage, showHUD, showToast } from "@raycast/api";
import { generator } from "./lib/generator";

export default async () => {
  let no = await LocalStorage.getItem("last-generate-tc");

  if (!no) {
    no = generator();
  }

  await Clipboard.copy(no as string);

  await showToast({
    title: "Turkish Identification Number",
    message: `Copied ${no} to clipboard`,
  });

  await showHUD("Copied to clipboard");
};
