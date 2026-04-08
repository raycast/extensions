import { showHUD } from "@raycast/api";
import { execFileSync } from "child_process";
import { ensureBinary } from "./compile";
import { toHudMessage } from "./errors";

export default async function toggleSidebar(): Promise<void> {
  let binaryPath: string;

  try {
    binaryPath = ensureBinary();
  } catch {
    await showHUD("Failed to compile — run: xcode-select --install");
    return;
  }

  try {
    execFileSync(binaryPath);
    await showHUD("Toggled Chrome sidebar");
  } catch (error: unknown) {
    await showHUD(toHudMessage(error));
  }
}
