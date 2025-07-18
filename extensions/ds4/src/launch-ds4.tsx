import { showToast, Toast } from "@raycast/api";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export default async function Command() {
  console.log("=== DS4 Command Started ===");
  console.log("Timestamp:", new Date().toISOString());

  try {
    // Use direct path instead of environment variable
    const ds4Path = "C:\\Users\\qasim\\Downloads\\DS4Windows\\DS4Windows";
    console.log("Using hardcoded path:", ds4Path);

    // Construct full path to DS4Windows.exe
    const ds4ExePath = path.join(ds4Path, "DS4Windows.exe");
    console.log("Constructed DS4Windows.exe path:", ds4ExePath);

    // Check if the file exists
    console.log("Checking if file exists...");
    const fileExists = fs.existsSync(ds4ExePath);
    console.log("File exists:", fileExists);

    if (!fileExists) {
      console.log("ERROR: DS4Windows.exe not found at path:", ds4ExePath);

      // List directory contents for debugging
      try {
        const dirContents = fs.readdirSync(ds4Path);
        console.log("Directory contents:", dirContents);
      } catch (dirError) {
        console.log("ERROR: Cannot read directory:", dirError);
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "DS4Windows.exe not found",
        message: `File not found at: ${ds4ExePath}`,
      });
      return;
    }

    // Launch DS4Windows using spawn (better for Windows)
    console.log("Attempting to launch DS4Windows...");
    const child = spawn(ds4ExePath, [], {
      detached: true,
      stdio: "ignore",
    });

    console.log("Process spawned with PID:", child.pid);

    // Handle process events
    child.on("error", (error) => {
      console.log("Process error:", error);
    });

    child.on("spawn", () => {
      console.log("Process spawned successfully");
    });

    // Unreference the child process so the parent can exit
    child.unref();

    console.log("DS4Windows launch completed successfully");
    await showToast({
      style: Toast.Style.Success,
      title: "DS4Windows Launched",
      message: "DS4Windows has been started successfully",
    });
  } catch (error) {
    console.log("FATAL ERROR:", error);
    console.log(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to launch DS4Windows",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }

  console.log("=== DS4 Command Finished ===");
}
