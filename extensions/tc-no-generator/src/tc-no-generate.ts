import { Clipboard, closeMainWindow, LocalStorage, showToast } from "@raycast/api";
import { generator } from "./lib/generator";
import { setTimeout } from "timers/promises";

export default async () => {
  const no = generator();
  await Clipboard.copy(no);

  await LocalStorage.setItem("last-generate-tc", no);

  await showToast({
    title: "TC No",
    message: `Copied ${no} to clipboard`,
  });

  await setTimeout(500);

  await closeMainWindow({ clearRootSearch: true });
};
