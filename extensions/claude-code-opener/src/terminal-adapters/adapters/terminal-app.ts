import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { TerminalAdapter } from "../types";

const execAsync = promisify(exec);

export class TerminalAppAdapter implements TerminalAdapter {
  name = "Terminal";
  bundleId = "com.apple.Terminal";

  async open(directory: string, claudeBinary: string): Promise<void> {
    const userShell = process.env.SHELL || "/bin/zsh";
    const escapedDir = directory.replace(/'/g, "'\\''");
    const escapedBinary = claudeBinary.replace(/'/g, "'\\''");

    const command = `cd '${escapedDir}'
clear
'${escapedBinary}'
exec ${userShell}`;

    const scriptFile = `/tmp/terminal-cmd-${Date.now()}.sh`;
    await writeFile(scriptFile, command, { mode: 0o644 });

    const openScript = `
      tell application "Terminal"
        do script "${userShell} -l -i -c 'source ${scriptFile} && rm ${scriptFile}'"
        activate
      end tell
    `;

    try {
      await execAsync(`osascript -e '${openScript.replace(/'/g, "'\"'\"'").replace(/\n/g, "' -e '")}'`);
    } finally {
      setTimeout(() => {
        unlink(scriptFile).catch(() => {});
      }, 5000);
    }
  }
}
