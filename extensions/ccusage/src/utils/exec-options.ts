import { getEnhancedNodePaths } from "./node-path-resolver";
import { dirname } from "path";
import { preferences } from "../preferences";

export const getExecOptions = () => {
  const env: Record<string, string> = {
    ...process.env,
    PATH: getEnhancedNodePaths(),
  };

  // Prepend custom npx directory to PATH for proper binary resolution
  const customNpxPath = preferences.customNpxPath?.trim();
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
      env.FNM_DIR = `${process.env.HOME}/.fnm`;
    }
    if (!process.env.npm_config_prefix) {
      env.npm_config_prefix = `${process.env.HOME}/.npm-global`;
    }
  }

  return {
    env,
    timeout: 30000,
    cwd: process.env.HOME || process.cwd(),
  };
};
