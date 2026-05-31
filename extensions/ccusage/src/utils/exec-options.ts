import { getEnhancedNodePaths, resolveFnmBaseDir } from "./node-path-resolver";
import { delimiter, dirname } from "path";
import { homedir } from "os";
import pathKey from "path-key";
import { getCustomNpxPath } from "../preferences";

const isWindows = process.platform === "win32";

export const getExecOptions = () => {
  const env: NodeJS.ProcessEnv = { ...process.env };

  // PATH is case-insensitive on Windows and conventionally spelled `Path`.
  // Resolve the real key so we overwrite the existing variable instead of
  // adding a second, ambiguous `PATH` entry. cross-spawn (used by execa and
  // useExec) reads the same key when resolving the command.
  const key = pathKey({ env });
  let path = getEnhancedNodePaths(env[key] ?? "");

  // Prepend a custom npx directory if the user configured one.
  const customNpxPath = getCustomNpxPath();
  if (customNpxPath) {
    path = `${dirname(customNpxPath)}${delimiter}${path}`;
  }
  env[key] = path;

  // Version-manager env vars (nvm/fnm/npm-global) only apply to the Unix
  // layout. On Windows binaries are resolved from PATH directly.
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
  };
};
