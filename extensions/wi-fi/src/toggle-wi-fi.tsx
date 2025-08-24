import { toggleWifi } from "./utils/common-utils";
import { closeMainWindow, launchCommand, LaunchType } from "@raycast/api";

export default async () => {
  try {
    await closeMainWindow({ clearRootSearch: false });
    await toggleWifi();

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await launchCommand({ name: "wi-fi-signal", type: LaunchType.Background });
  } catch (e) {
    console.error(e);
  }
};
