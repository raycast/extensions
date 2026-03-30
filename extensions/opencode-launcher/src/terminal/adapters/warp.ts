import { runAppleScript } from "@raycast/utils";
import { execFile } from "child_process";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { join } from "path";
import { homedir, tmpdir } from "os";
import { promisify } from "util";
import type { TerminalAdapter } from "../types";
import { escapeAppleScript } from "../utils";

const execFileAsync = promisify(execFile);

export const warpAdapter: TerminalAdapter = {
  name: "Warp",
  bundleId: "dev.warp.Warp-Stable",
  async open(command: string): Promise<void> {
    const directory = await mkdtemp(join(tmpdir(), "raycast-opencode-warp-"));
    const configPath = join(directory, "launch_config.yaml");
    const launchConfig = [
      "windows:",
      "  - tabs:",
      "      - title: OpenCode",
      "        layout:",
      `          cwd: ${JSON.stringify(process.env.HOME ?? homedir())}`,
      "        commands:",
      `          - exec: ${JSON.stringify(command)}`,
      "",
    ].join("\n");

    await writeFile(configPath, launchConfig, "utf8");

    try {
      await execFileAsync("open", [`warp://launch-config?path=${encodeURIComponent(configPath)}`]);
      return;
    } catch {
      await execFileAsync("open", ["-a", "Warp"]);

      const escaped = escapeAppleScript(command);
      await runAppleScript(`
        tell application "Warp" to activate
        delay 0.3
        tell application "System Events"
          keystroke "${escaped}"
          key code 36
        end tell
      `);
    } finally {
      await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
  },
};
