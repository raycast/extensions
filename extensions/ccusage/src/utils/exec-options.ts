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
    // On Windows, `npx`/`ccusage` are `.cmd` shims that Node's spawn cannot
    // execute directly (ENOENT). Running through a shell lets cmd.exe resolve
    // them via PATHEXT. Our args are simple tokens, so shell quoting is safe.
    ...(isWindows ? { shell: true } : {}),
  };
};
