import { toggleWifi } from "./utils/common-utils";
import { closeMainWindow, launchCommand, LaunchType } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  await toggleWifi();
  await launchCommand({ name: "wi-fi-signal", type: LaunchType.Background });
};
