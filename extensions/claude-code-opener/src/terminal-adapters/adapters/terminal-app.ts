import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdtemp, rmdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { TerminalAdapter } from "../types";

const execAsync = promisify(exec);

export class TerminalAppAdapter implements TerminalAdapter {
  name = "Terminal";
  bundleId = "com.apple.Terminal";

  private escapeAppleScript(script: string): string {
    return script.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  async open(directory: string, claudeBinary: string): Promise<void> {
    const userShell = process.env.SHELL || "/bin/zsh";
    const escapedDir = directory.replace(/'/g, "'\\''");
    const escapedBinary = claudeBinary.replace(/'/g, "'\\''");

    const command = `cd '${escapedDir}'
clear
'${escapedBinary}'
exec ${userShell}`;

    const tempDir = await mkdtemp(join(tmpdir(), "claude-code-"));
    const scriptFile = join(tempDir, "run.sh");
    await writeFile(scriptFile, command, { mode: 0o600 });

    const shellCommand = `${userShell} -l -i -c 'source ${scriptFile} && rm -rf ${tempDir}'`;
    const escapedCommand = this.escapeAppleScript(shellCommand);

    const openScript = `tell application "Terminal"
do script "${escapedCommand}"
activate
end tell`;

    try {
      await execAsync(`osascript -e "${this.escapeAppleScript(openScript)}"`);

      setTimeout(async () => {
        try {
          await unlink(scriptFile).catch(() => {});
          await rmdir(tempDir).catch(() => {});
        } catch (error) {
          console.error("Failed to clean up temp files:", error);
        }
      }, 1000);
    } catch (error) {
      try {
        await unlink(scriptFile).catch(() => {});
        await rmdir(tempDir).catch(() => {});
      } catch (cleanupError) {
        console.error("Failed to clean up temp files after error:", cleanupError);
      }
      throw error;
    }
  }
}
