import { dirname } from "node:path";
import { getCustomNpxPath } from "../preferences";
import { getEnhancedNodePaths, resolveFnmBaseDir } from "./node-path-resolver";

const isWindows = process.platform === "win32";

export const getExecOptions = () => {
  const env: Record<string, string> = {
    ...process.env,
    PATH: getEnhancedNodePaths(),
  };

  const customNpxPath = getCustomNpxPath();
  if (customNpxPath) {
    const customDir = dirname(customNpxPath);
    env.PATH = isWindows ? `${customDir};${env.PATH}` : `${customDir}:${env.PATH}`;
  }

  if (!isWindows && process.env.HOME) {
    const home = process.env.HOME;

    if (!process.env.NVM_DIR) {
      env.NVM_DIR = `${home}/.nvm`;
    }

    if (!process.env.FNM_DIR) {
      const fnmBaseDir = resolveFnmBaseDir(home);
      if (fnmBaseDir) {
        env.FNM_DIR = fnmBaseDir;
      }
    }

    if (!process.env.npm_config_prefix) {
      env.npm_config_prefix = `${home}/.npm-global`;
    }
  }

  const cwd = isWindows ? process.env.USERPROFILE || process.cwd() : process.env.HOME || process.cwd();

  return {
    env,
    timeout: 30000,
    cwd,
  };
};
