import { showToast, Toast } from "@raycast/api";
import { execa } from "execa";
import { existsSync } from "fs";

// Common paths where Homebrew installs SwitchAudioSource
const SWITCH_AUDIO_PATHS = [
  "/opt/homebrew/bin/SwitchAudioSource", // Apple Silicon
  "/usr/local/bin/SwitchAudioSource", // Intel Mac
];

export function getSwitchAudioPath(): string | null {
  for (const path of SWITCH_AUDIO_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

export async function checkDependencies(): Promise<boolean> {
  return getSwitchAudioPath() !== null;
}

export async function installDependencies() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Installing dependencies...",
  });

  try {
    // Open Terminal to run brew install
    // This is safer than running in background as it might require password or user interaction
    const script = `tell application "Terminal" to do script "brew install switchaudio-osx"`;
    await execa("osascript", ["-e", script]);

    toast.style = Toast.Style.Success;
    toast.title = "Installation started";
    toast.message = "Please check the opened Terminal window";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to start installation";
    toast.message = String(error);
  }
}
