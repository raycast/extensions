import { showHUD, open } from "@raycast/api";

export async function runSegueCommand(command: string, successMessage: string): Promise<void> {
  try {
    await open(`segue://${command}`);
    await showHUD(successMessage);
  } catch {
    await showHUD("❌ Failed - Is Segue running?");
  }
}
