import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { readCachedStatus, writeCachedStatus } from "./status-cache";
import { ensureTrackingState, fetchTrackingStatus } from "./taxmaro";
import { optimisticallySetRunning } from "./tracking-status";

const refreshMenuBar = async (): Promise<void> => {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch (error) {
    console.error("Could not refresh the Taxmaro menu-bar command", error);
  }
};

const Command = async () => {
  const previous = readCachedStatus() ?? (await fetchTrackingStatus());
  const desiredRunning = !previous.running;
  const optimistic = optimisticallySetRunning(previous, desiredRunning);

  writeCachedStatus(optimistic);
  await showHUD(desiredRunning ? "Tracking started" : "Tracking stopped");
  void refreshMenuBar();

  try {
    await ensureTrackingState(desiredRunning);
    await fetchTrackingStatus();
    await refreshMenuBar();
  } catch (error) {
    writeCachedStatus(previous);
    await refreshMenuBar();
    console.error(error);
    await showHUD(desiredRunning ? "Couldn’t start tracking" : "Couldn’t stop tracking");
  }
};

export default Command;
