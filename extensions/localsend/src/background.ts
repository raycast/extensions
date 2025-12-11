import { getPreferenceValues, environment } from "@raycast/api";
import { startReceiveServer } from "./utils/receive-server";
import { startDiscoveryService } from "./utils/discovery-service";

interface Preferences {
  httpPort: string;
  enableReceive: boolean;
  enableDiscovery?: boolean;
}

const initializeServices = async () => {
  if (!environment.canAccess(environment.supportPath)) {
    return;
  }

  const prefs = getPreferenceValues<Preferences>();

  if (prefs.enableDiscovery !== false) {
    try {
      startDiscoveryService();
      console.log("LocalSend discovery service started");
    } catch (error) {
      console.error("Failed to start discovery service:", error);
    }
  }

  if (prefs.enableReceive) {
    const port = parseInt(prefs.httpPort || "53318", 10);
    try {
      await startReceiveServer(port);
      console.log(`LocalSend receive server started on port ${port}`);
    } catch (error) {
      console.error("Failed to start receive server:", error);
    }
  }
};

initializeServices();
