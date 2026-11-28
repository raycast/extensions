import { existsSync } from "fs";
import { getEnhancedNodePaths, resolveFnmBaseDir } from "./node-path-resolver";
import { dirname } from "path";
import { getCustomNpxPath } from "../preferences";

export const getExecOptions = () => {
  const env: Record<string, string> = {
    ...process.env,
    PATH: getEnhancedNodePaths(),
  };

  // Prepend custom npx directory to PATH for proper binary resolution
  const customNpxPath = getCustomNpxPath();
  if (customNpxPath) {
    const customDir = dirname(customNpxPath);
    env.PATH = `${customDir}:${env.PATH}`;
  }

  // Add HOME-dependent paths only if HOME is available
  if (process.env.HOME) {
    if (!process.env.NVM_DIR) {
      env.NVM_DIR = `${process.env.HOME}/.nvm`;
    }
    if (!process.env.FNM_DIR) {
      const fnmBaseDir = resolveFnmBaseDir(process.env.HOME);
      if (fnmBaseDir) {
        env.FNM_DIR = fnmBaseDir;
      }
    }
    // Pointing npm at a prefix directory that does not exist makes npx fail
    // with ENOENT (exit code 254), so only opt in when the user actually has one.
    const npmGlobalPrefix = `${process.env.HOME}/.npm-global`;
    if (!process.env.npm_config_prefix && existsSync(npmGlobalPrefix)) {
      env.npm_config_prefix = npmGlobalPrefix;
    }
  }

  return {
    env,
    timeout: 30000,
    cwd: process.env.HOME || process.cwd(),
  };
};
