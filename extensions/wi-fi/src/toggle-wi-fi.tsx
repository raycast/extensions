import { toggleWifi } from "./utils/common-utils";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  await toggleWifi();
};
