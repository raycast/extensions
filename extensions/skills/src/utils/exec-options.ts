import { dirname } from "node:path";
import { getCustomNpxPath } from "../preferences";
import { getEnhancedNodePaths, pathExists, resolveFnmBaseDir } from "./node-path-resolver";

const isWindows = process.platform === "win32";

export const getExecOptions = async () => {
  const env: Record<string, string> = {
    ...process.env,
    PATH: await getEnhancedNodePaths(),
  };

  const customNpxPath = getCustomNpxPath();
  if (customNpxPath) {
    const customDir = dirname(customNpxPath);
    env.PATH = isWindows ? `${customDir};${env.PATH}` : `${customDir}:${env.PATH}`;
  }

  if (!isWindows && process.env.HOME) {
    const home = process.env.HOME;

    const nvmDir = `${home}/.nvm`;
    if (!process.env.NVM_DIR && (await pathExists(nvmDir))) {
      env.NVM_DIR = nvmDir;
    }

    if (!process.env.FNM_DIR) {
      const fnmBaseDir = await resolveFnmBaseDir(home);
      if (fnmBaseDir) {
        env.FNM_DIR = fnmBaseDir;
      }
    }

    const npmGlobalDir = `${home}/.npm-global`;
    if (!process.env.npm_config_prefix && (await pathExists(npmGlobalDir))) {
      env.npm_config_prefix = npmGlobalDir;
    }
  }

  const cwd = isWindows ? process.env.USERPROFILE || process.cwd() : process.env.HOME || process.cwd();

  return {
    env,
    timeout: 30000,
    cwd,
  };
};
