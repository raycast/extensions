import { Clipboard, LocalStorage, showHUD, showToast } from "@raycast/api";
import { generator } from "./lib/generator";

export default async () => {
  const no = generator();
  await Clipboard.copy(no);

  await LocalStorage.setItem("last-generate-tc", no);

  await showToast({
    title: "Turkish Identification Number",
    message: `Copied ${no} to clipboard`,
  });

  await showHUD("Copied to clipboard");
};
