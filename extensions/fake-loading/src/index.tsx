import { ActionPanel, List, Action, showHUD, closeMainWindow, showToast, Toast } from "@raycast/api";
import React from "react";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { environment } from "@raycast/api";

const execPromise = promisify(exec);

// Our own implementation of showFailureToast
async function showFailureToast(error: unknown, options?: { title?: string }) {
  const toast = await showToast({
    style: Toast.Style.Failure,
    title: options?.title || "Something went wrong",
    message: error instanceof Error ? error.message : String(error),
  });

  return toast;
}

interface LoadingScreen {
  id: string;
  name: string;
  path: string;
}

// Sample loading screens with relative paths
const loadingScreens: LoadingScreen[] = [
  {
    id: "windows",
    name: "Windows XP Loading",
    path: join(environment.assetsPath, "loadings", "xp.gif"),
  },
  {
    id: "blue-screen",
    name: "Windows Blue Screen",
    path: join(environment.assetsPath, "loadings", "xp-blue-screen-1.gif"),
  },
  {
    id: "blue-screen-alt",
    name: "Windows Blue Screen (Alt)",
    path: join(environment.assetsPath, "loadings", "xp-blue-screen-2.gif"),
  },
  {
    id: "my-computer",
    name: "My Computer",
    path: join(environment.assetsPath, "loadings", "my-computer.gif"),
  },
  {
    id: "mac-update",
    name: "Mac Update",
    path: join(environment.assetsPath, "loadings", "mac-update.gif"),
  },
];

export default function Command() {
  return (
    <List>
      {loadingScreens.map((screen) => (
        <List.Item
          key={screen.id}
          title={screen.name}
          actions={
            <ActionPanel>
              <Action title="Show Loading Screen" onAction={() => showLoading(screen.path)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function showLoading(file: string) {
  try {
    // Create a temporary HTML file that will display the GIF in true fullscreen
    const htmlFilePath = join(tmpdir(), "fullscreen-viewer.html");
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Fullscreen GIF</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      background-color: #000;
      overflow: hidden;
    }
    .fullscreen-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      background-color: #000;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .gif {
      width: 100vw;
      height: 100vh;
      object-fit: fill; /* This fills the entire screen */
      position: absolute;
      top: 0;
      left: 0;
    }
  </style>
</head>
<body>
  <div class="fullscreen-container">
    <img class="gif" src="file://${file}" alt="Fullscreen GIF">
  </div>
  <script>
    // Enter fullscreen on load
    window.onload = function() {
      // Go fullscreen immediately
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
      
      // Make sure no cursor is visible
      document.body.style.cursor = 'none';
    }
    
    // Handle click anywhere to exit
    document.addEventListener('click', function() {
      window.close();
    });
    
    // Handle ESC key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        window.close();
      }
    });
  </script>
</body>
</html>
    `;

    writeFileSync(htmlFilePath, htmlContent);

    // Use AppleScript to open Chrome in true fullscreen mode
    const appleScript = `
tell application "Google Chrome"
  activate
  open location "file://${htmlFilePath}"
  delay 0.5
  tell application "System Events"
    keystroke "f" using {command down, control down}
  end tell
end tell
    `;

    const tempScriptPath = join(tmpdir(), "open-fullscreen.scpt");
    writeFileSync(tempScriptPath, appleScript);

    // Execute the AppleScript
    await execPromise(`osascript "${tempScriptPath}"`);

    closeMainWindow();
    await showHUD("Fake Loading Activated");
  } catch (error) {
    await showFailureToast(error, { title: "Error showing Fake Loading" });
  }
}
