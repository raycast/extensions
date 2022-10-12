import { Clipboard, closeMainWindow, LocalStorage, showToast } from "@raycast/api";
import { generator } from "./lib/generator";
import { setTimeout } from "timers/promises";

export default async () => {
  let no = await LocalStorage.getItem("last-generate-tc");

  if (!no) {
    no = generator();
  }

  await Clipboard.copy(no as string);

  await showToast({
    title: "TC No",
    message: `Copied ${no} to clipboard`,
  });

  await setTimeout(500);

  await closeMainWindow({ clearRootSearch: true });
};
