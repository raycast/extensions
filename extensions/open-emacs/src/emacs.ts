import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

function getEmacsPath(): string {
  const homeDir = os.homedir();

  // Potential paths for Emacs
  const paths = [
    // Scoop
    path.join(homeDir, "scoop", "apps", "emacs", "current", "bin", "runemacs.exe"),
    // Chocolatey / Default install
    "C:\\ProgramData\\chocolatey\\bin\\runemacs.exe",
    "C:\\tools\\emacs\\bin\\runemacs.exe",
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to expecting it in PATH
  return "runemacs.exe";
}

export default async function Command() {
  await closeMainWindow({ clearRootSearch: true });

  const emacsPath = getEmacsPath();

  try {
    const child = spawn(emacsPath, [], {
      detached: true,
      stdio: "ignore",
    });

    child.on("error", (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to launch Emacs",
        message: err.message,
      });
    });

    child.unref();
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
