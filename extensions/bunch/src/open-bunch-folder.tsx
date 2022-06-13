import { scriptToGetBunchFolder } from "./utils/applescript-utils";
import { closeMainWindow, open, showHUD } from "@raycast/api";
import { isEmpty } from "./utils/common-utils";
import * as fs from "fs";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const bunchFolder = await scriptToGetBunchFolder();
  if (isEmpty(bunchFolder) || !fs.existsSync(bunchFolder)) {
    await showHUD("No folder detected");
    return;
  }
  await open(bunchFolder);
  await showHUD("Open: " + bunchFolder);
};
