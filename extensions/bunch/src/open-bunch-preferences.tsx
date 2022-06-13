import { closeMainWindow, open, showHUD } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  await open("x-bunch://prefs");
  await showHUD("Open Bunch preferences ");
};
