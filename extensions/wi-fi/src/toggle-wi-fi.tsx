import { toggleWifi } from "./utils/common-utils";
import { closeMainWindow, launchCommand, LaunchType } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  await toggleWifi();
  try {
    const sleep = (milliseconds: number) => {
      return new Promise((resolve) => setTimeout(resolve, milliseconds));
    };
    /*
    When the wifi switch is triggered, the menu bar command may not be able to obtain the wifi information in time, so it needs to be triggered several times.
     */
    for (let i = 0; i < 3; i++) {
      // Delay loop n times
      await sleep(2000);
      await launchCommand({ name: "wi-fi-signal", type: LaunchType.Background });
    }
  } catch (e) {
    console.error(e);
  }
};
