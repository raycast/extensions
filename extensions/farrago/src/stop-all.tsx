import { showHUD } from "@raycast/api";

import { withFarragoRunningNoView } from "./contexts/appInfoContext";
import { initializeFarragoOscSender } from "./services/initializers";

export default withFarragoRunningNoView(async () => {
  showHUD("Stopped all sounds");

  const oscSender = initializeFarragoOscSender();
  await oscSender.runTransportAction("stopAll");
});
