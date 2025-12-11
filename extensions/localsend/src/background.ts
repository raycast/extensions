import { getPreferenceValues, environment } from "@raycast/api";
import { startReceiveServer } from "./utils/receive-server";

interface Preferences {
  httpPort: string;
  enableReceive: boolean;
}

const initializeReceiveServer = async () => {
  if (!environment.canAccess(environment.supportPath)) {
    return;
  }

  const prefs = getPreferenceValues<Preferences>();
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

initializeReceiveServer();
