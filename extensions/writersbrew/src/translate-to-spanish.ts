import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { isWritersBrewInstalled } from "./checkInstall";

export default async () => {
  if (await isWritersBrewInstalled()) {
    const url = "writerbrew://translate-to-spanish";
    open(url);
    await closeMainWindow();
  } else {
    open("https://writersbrew.app/#integrations");
    await closeMainWindow();
  }
};
