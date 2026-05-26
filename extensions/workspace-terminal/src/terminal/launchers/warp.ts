import { existsSync } from "fs";
import { mkdir, readdir, unlink, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { dump } from "js-yaml";

import type {
  TerminalDetection,
  TerminalLauncher,
  LaunchRequest,
} from "../types";
import { detectCliOrApp, findCli } from "../detect";
import { execFileAsync } from "../exec";

const WARP_CONFIG_DIR = join(homedir(), ".warp", "launch_configurations");
const FILE_PREFIX = "workspace-terminal__";

function safeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function cleanupOldConfigs(prefix: string): Promise<void> {
  if (!existsSync(WARP_CONFIG_DIR)) {
    return;
  }

  const files = await readdir(WARP_CONFIG_DIR);
  await Promise.all(
    files
      .filter((file) => file.startsWith(prefix) && file.endsWith(".yaml"))
      .map((file) =>
        unlink(join(WARP_CONFIG_DIR, file)).catch(() => undefined),
      ),
  );
}

async function openWarpUrl(url: string): Promise<void> {
  await execFileAsync("open", [url]);
}

export const warpLauncher: TerminalLauncher = {
  type: "warp",
  title: "Warp",
  reuseSupport: "bestEffort",
  checkInstalled(): Promise<TerminalDetection> {
    return detectCliOrApp("warp", "Warp.app");
  },
  async launch(request: LaunchRequest): Promise<void> {
    if (!request.command) {
      const action = request.reuseWindow ? "new_tab" : "new_window";
      await openWarpUrl(
        `warp://action/${action}?path=${encodeURIComponent(request.cwd)}`,
      );
      return;
    }

    await mkdir(WARP_CONFIG_DIR, { recursive: true });

    const nameBase = `${FILE_PREFIX}${safeName(request.project.name) || "workspace"}`;
    await cleanupOldConfigs(nameBase);

    const configName = `${nameBase}_${Date.now()}`;
    const configPath = join(WARP_CONFIG_DIR, `${configName}.yaml`);
    const config = {
      name: configName,
      windows: [
        {
          tabs: [
            {
              title: request.project.name,
              layout: {
                cwd: request.cwd,
                commands: [{ exec: request.command }],
              },
            },
          ],
        },
      ],
    };

    await writeFile(configPath, dump(config, { noRefs: true }), "utf-8");

    const launchUrl = `warp://launch/${encodeURIComponent(configName)}`;
    try {
      await openWarpUrl(launchUrl);
      return;
    } catch {
      await execFileAsync("open", ["-a", "Warp"]);
      const warpCli = await findCli("warp");
      if (warpCli) {
        await execFileAsync(warpCli, ["launch", configName]);
      }
    }
  },
};
