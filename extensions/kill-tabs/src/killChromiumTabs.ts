import { showHUD } from "@raycast/api";
import killTabs from "kill-tabs";

const KillChromiumTabs = async () => {
  try {
    await killTabs({ chromium: true });
    await showHUD("Killed all tabs");
  } catch {
    await showHUD("Something went wrong!");
  }
};

export default KillChromiumTabs;
