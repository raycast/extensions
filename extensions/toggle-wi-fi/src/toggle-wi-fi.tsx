import { execSync } from "child_process";
import { closeMainWindow, showHUD } from "@raycast/api";
import { shellEnv } from "shell-env";

export default async () => {
  try {
    await closeMainWindow({ clearRootSearch: false });
    const execEnv = await getCachedEnv();
    const out = execSync(
      `networksetup -listnetworkserviceorder | sed -n '/Wi-Fi/s|.*Device: \\(.*\\)).*|\\1|p'`,
      execEnv
    );
    const device = String(out).trim();
    const out2 = execSync(`networksetup -getairportnetwork ${device}`, execEnv);
    const network = String(out2).trim();
    if (network.includes("off")) {
      await showHUD("Wi-Fi turned on");
      execSync(`networksetup -setairportpower ${device} on`, execEnv);
    } else {
      await showHUD("Wi-Fi turned off");
      execSync(`networksetup -setairportpower ${device} off`, execEnv);
    }
  } catch (e) {
    console.error(e);
    await showHUD(String(e));
  }
};

interface EnvType {
  env: Record<string, string>;
  cwd: string;
  shell: string;
}

let cachedEnv: null | EnvType = null;

const getCachedEnv = async () => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env = await shellEnv();

  cachedEnv = {
    env: env,
    cwd: env.HOME || `/Users/${process.env.USER}`,
    shell: env.SHELL,
  };
  return cachedEnv;
};
