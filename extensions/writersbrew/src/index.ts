import { closeMainWindow } from "@raycast/api";
import open from "open";
import { isWritersBrewInstalled } from "./checkInstall";

export default async () => {
  if (await isWritersBrewInstalled()) {
    const url = "writerbrew://fix-grammar";
    open(url);
    await closeMainWindow();
  } else {
    open("https://writersbrew.app/#integrations");
    await closeMainWindow();
  }
};
