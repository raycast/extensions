import { exec } from "child_process";
import { promisify } from "util";
import { platform } from "os";

const execAsync = promisify(exec);

export const runInTerminal = async (command: string): Promise<void> => {
  // Check if we're on macOS
  if (platform() !== "darwin") {
    throw new Error("Terminal commands are only supported on macOS");
  }

  const escapedCommand = command.replace(/"/g, '\\"');
  const scriptCommand = `
    osascript -e 'tell application "Terminal"
      activate
      do script "${escapedCommand}"
    end tell'
  `;

  await execAsync(scriptCommand);
};

export const sendmeInTerminal = async (filePath: string): Promise<void> => {
  const escapedPath = filePath.replace(/"/g, '\\"');
  await runInTerminal(`./sendme send "${escapedPath}"`);
};
