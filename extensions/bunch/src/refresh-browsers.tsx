import { scriptToRefreshBrowsers } from "./utils/applescript-utils";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const result = await scriptToRefreshBrowsers();
  await showHUD(result);
};
