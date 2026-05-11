import { closeMainWindow } from "@raycast/api";
import { killRunningSay } from "./speech.js";

export default async function StopRunningSay() {
  try {
    await closeMainWindow();
    await killRunningSay();
  } catch {
    // Handle error gracefully
  }
}
