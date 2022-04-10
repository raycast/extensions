import { showHUD } from "@raycast/api";
import killTabs from "kill-tabs";

const KillChromeTabs = async () => {
  try {
    await killTabs({ chrome: true });
    await showHUD("Killed all tabs");
  } catch {
    await showHUD("Something went wrong!");
  }
};

export default KillChromeTabs;
