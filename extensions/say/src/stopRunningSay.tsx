import { closeMainWindow } from "@raycast/api";
import { killRunningSay } from "mac-say";

export default async function StopRunningSay() {
  try {
    await closeMainWindow();
    await killRunningSay();
  } catch {
    // Handle error gracefully
  }
}
