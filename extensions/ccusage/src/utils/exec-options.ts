import { getEnhancedNodePaths, resolveFnmBaseDir } from "./node-path-resolver";
import { delimiter, dirname } from "path";
import { homedir } from "os";
import { getCustomNpxPath } from "../preferences";

const isWindows = process.platform === "win32";

export const getExecOptions = () => {
  const env: Record<string, string> = {
    ...process.env,
    PATH: getEnhancedNodePaths(),
  };

  // Prepend custom npx directory to PATH for proper binary resolution
  const customNpxPath = getCustomNpxPath();
  if (customNpxPath) {
    const customDir = dirname(customNpxPath);
    env.PATH = `${customDir}${delimiter}${env.PATH}`;
  }

  // Version-manager env vars (nvm/fnm/npm-global) only apply to the
  // Unix layout. Windows uses %APPDATA%\npm and PATH directly.
  const home = homedir();
  if (!isWindows && home) {
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

  return {
    env,
    timeout: 30000,
    cwd: home || process.cwd(),
    // On Windows, `npx`/`ccusage` are `.cmd` shims. `child_process.exec`
    // (used by the no-view tools) already runs via cmd.exe, but `useExec`'s
    // spawn does not and would throw ENOENT. Point both at cmd.exe so the
    // shims resolve via PATHEXT. Using the shell *path* (a string) rather
    // than `true` keeps the type compatible with exec's ExecOptions, which
    // only accepts `shell?: string`.
    shell: isWindows ? process.env.ComSpec || "cmd.exe" : undefined,
  };
};
