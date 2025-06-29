import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { DependencyInstaller } from "./utils/installer";

export default async function launchRio() {
  const installer = new DependencyInstaller();

  try {
    // Step 1: Ensure Rust toolchain is installed
    await installer.ensureRustToolchain();

    // Step 2: Install Rio if not already installed
    await installer.checkAndInstallCargoPackage({
      name: "Rio Terminal",
      packageName: "rioterm",
      binaryName: "rio",
    });

    // Step 3: Launch Rio
    const rioPath = join(homedir(), ".cargo", "bin", "rio");
    await closeMainWindow();

    exec(`"${rioPath}"`, (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to launch Rio",
          message: error.message,
        });
      } else {
        showHUD("Rio Terminal launched!");
      }
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Setup failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
