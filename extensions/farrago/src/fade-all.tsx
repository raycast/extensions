import { showHUD } from "@raycast/api";

import { withFarragoRunningNoView } from "./contexts/appInfoContext";
import { initializeFarragoOscSender } from "./services/initializers";

export default withFarragoRunningNoView(async () => {
  showHUD("Fading all sounds...");

  const oscSender = initializeFarragoOscSender();
  await oscSender.runMasterAction("fadeAll");
});
