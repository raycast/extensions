import { quitApps } from "./utils/applescript-utils";
import { closeMainWindow } from "@raycast/api";
import { getEnabledApps } from "./utils/common-utils";

export default async () => {
  await closeMainWindow();
  await quitApps(getEnabledApps());
};
