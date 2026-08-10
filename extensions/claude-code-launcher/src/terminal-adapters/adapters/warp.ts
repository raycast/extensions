import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir, unlink } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { TerminalAdapter } from "../types";

const execFileAsync = promisify(execFile);

export class WarpAdapter implements TerminalAdapter {
  name = "Warp";
  bundleId = "dev.warp.Warp-Stable";

  private readonly launchConfigDir = join(homedir(), ".warp", "launch_configurations");

  async open(directory: string): Promise<void> {
    const configName = `claude-code-${randomUUID()}`;
    const configPath = join(this.launchConfigDir, `${configName}.yaml`);

    const yamlContent = `
name: ${configName}
windows:
  - tabs:
      - title: Claude Code
        layout:
          cwd: "${directory.replace(/"/g, '\\"')}"
          commands:
            - exec: claude
`;

    try {
      await mkdir(this.launchConfigDir, { recursive: true });
      await writeFile(configPath, yamlContent, "utf-8");

      await execFileAsync("open", [`warp://launch/${configName}`]);
      setTimeout(async () => {
        try {
          await unlink(configPath);
        } catch {
          // Ignore cleanup errors
        }
      }, 5000);
    } catch (error) {
      try {
        await unlink(configPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
}
