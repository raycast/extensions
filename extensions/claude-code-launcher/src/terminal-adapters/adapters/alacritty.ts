import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { TerminalAdapter } from "../types";

const execAsync = promisify(exec);

export class AlacrittyAdapter implements TerminalAdapter {
  name = "Alacritty";
  bundleId = "org.alacritty";

  async open(directory: string, claudeBinary: string): Promise<void> {
    const userShell = process.env.SHELL || "/bin/zsh";
    const escapedDir = directory.replace(/'/g, "'\\''");
    const escapedBinary = claudeBinary.replace(/'/g, "'\\''");

    const initScript = join(tmpdir(), `claude-init-${Date.now()}.sh`);
    const initContent = `cd '${escapedDir}'
clear
'${escapedBinary}'
`;

    await writeFile(initScript, initContent, { mode: 0o644 });

    try {
      await execAsync(
        `open -n -a Alacritty --args -e ${userShell} -l -i -c "source ${initScript} && rm -f ${initScript}; exec ${userShell} -l"`,
      );
    } finally {
      setTimeout(() => {
        unlink(initScript).catch(() => {});
      }, 5000);
    }
  }
}
