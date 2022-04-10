import { showHUD } from "@raycast/api";
import killTabs from "kill-tabs";

const KillBraveTabs = async () => {
  try {
    await killTabs({ brave: true });
    await showHUD("Killed all tabs");
  } catch {
    await showHUD("Something went wrong!");
  }
};

export default KillBraveTabs;
