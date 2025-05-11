import { Action, ActionPanel, environment, Grid, Icon, showHUD, closeMainWindow } from "@raycast/api";
import { readdirSync, statSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";

const execPromise = promisify(exec);

export default function Command() {
  // Get all loading files from all directories
  const dirs = readdirSync(environment.assetsPath)
    .map((item) => join(environment.assetsPath, item))
    .filter((item) => statSync(item).isDirectory());

  // Collect all files from all directories
  const allFiles = dirs.flatMap((dir) =>
    readdirSync(dir)
      .map((item) => join(dir, item))
      .filter((item) => statSync(item).isFile()),
  );

  return (
    <Grid columns={4}>
      <Grid.Section title="Fake Loading">
        {allFiles.map((file) => (
          <FileItem key={file} file={file} />
        ))}
      </Grid.Section>
    </Grid>
  );
}

function FileItem(props: { file: string }) {
  // Extract base filename without extension
  const fileName = basename(props.file).replace(/\.\w+$/, "");

  return (
    <Grid.Item
      title={fileName}
      content={props.file}
      actions={
        <ActionPanel>
          <FakeLoadingAction file={props.file} />
        </ActionPanel>
      }
    />
  );
}

function FakeLoadingAction(props: { file: string }) {
  return (
    <Action
      title="Show Fake Loading"
      icon={Icon.Eye}
      onAction={async () => {
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
    <img class="gif" src="file://${props.file}" alt="Fullscreen GIF">
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
          showHUD("Fake Loading Activated");
        } catch (error) {
          console.error("Error opening file:", error);
          showHUD("Error showing Fake Loading");
        }
      }}
    />
  );
}
