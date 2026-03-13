import { showHUD } from "@raycast/api";
import {
  getCurrentState,
  setState,
  endCurrentSession,
} from "./utils/standing-desk-utils";
import type { DeskState } from "./utils/standing-desk-utils";

export default async function main() {
  try {
    const { state: currentState } = await getCurrentState();

    let newState: DeskState;

    if (!currentState) {
      // If no state, default to standing
      newState = "standing";
    } else {
      // Toggle between standing and sitting
      newState = currentState === "standing" ? "sitting" : "standing";
    }

    // End current session if exists
    if (currentState) {
      await endCurrentSession();
    }

    // Start new session
    const now = Date.now();
    await setState(newState, now);

    const stateLabel = newState === "standing" ? "Standing" : "Sitting";
    await showHUD(`Switched to ${stateLabel}`);
  } catch (error) {
    await showHUD(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
