import { showHUD, popToRoot } from "@raycast/api";
import { spawn } from "child_process";

export default async function Command() {
  await new Promise<void>((resolve, reject) => {
    // Kill explorer.exe
    const killProcess = spawn("taskkill", ["/f", "/im", "explorer.exe"], {
      windowsHide: true,
    });

    killProcess.on("error", (error) => {
      reject(error);
    });

    killProcess.on("exit", async (code) => {
      if (code !== 0 && code !== 128) {
        // 128 = process not found, which is okay
        reject(new Error(`Failed to kill explorer.exe: exit code ${code}`));
        return;
      }

      // Poll to ensure explorer is truly terminated
      let retryCount = 0;
      const maxRetries = 50; // Max 5 seconds (50 * 100ms)

      const checkTerminated = () => {
        if (retryCount >= maxRetries) {
          reject(new Error("Timeout waiting for explorer.exe to terminate"));
          return;
        }

        retryCount++;
        const checkProcess = spawn("tasklist", ["/FI", "IMAGENAME eq explorer.exe"], {
          windowsHide: true,
        });

        let output = "";
        checkProcess.stdout?.on("data", (data) => {
          output += data.toString();
        });

        checkProcess.on("exit", () => {
          if (!output.includes("explorer.exe")) {
            // Explorer is terminated, restart it
            spawn("explorer.exe", [], {
              detached: true,
              stdio: "ignore",
              windowsHide: true,
            });
            resolve();
          } else {
            // Check again in 100ms
            setTimeout(checkTerminated, 100);
          }
        });
      };

      // Start checking after a brief delay
      setTimeout(checkTerminated, 100);
    });
  });

  await showHUD("Windows Explorer restarted");
  await popToRoot();
}
