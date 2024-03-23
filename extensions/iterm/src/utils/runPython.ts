import path from "path";
import fs from "fs/promises";
import child_process from "child_process";
import { promisify } from "util";
import { environment } from "@raycast/api";

import type { LoggerFn } from "../core";

import { PyEvalError } from "./exceptions";
import { runAppleScript } from "./runAppleScript";

import { pythonDependencies } from "../../package.json";

const execFile = promisify(child_process.execFile);

const ENV_DIR_NAME = "pyenv";
const ENV_DIR = path.join(environment.supportPath, ENV_DIR_NAME);
const ENV_PYTHON_BIN = path.join(ENV_DIR, "bin/python");
const ENV_PIP_BIN = path.join(ENV_DIR, "bin/pip");
const REQUIREMENTS = path.join(ENV_DIR, "requirements.json");

const runPip = async (args: string[]) => {
  const { stdout } = await execFile(ENV_PIP_BIN, args, {
    env: {},
  });

  return stdout.trim();
};

const execPython = async (args: string[], external = false) => {
  const pythonRunner = external ? "python3" : ENV_PYTHON_BIN;
  const { stdout } = await execFile(pythonRunner, args, {
    env: {},
  });

  return stdout.trim();
};

const evalPython = async (script: string) =>
  execPython(["-I", "-c", script]).catch((err) => {
    throw new PyEvalError(err);
  });

const exists = async (file: string) => {
  try {
    await fs.stat(file);
    return true;
  } catch (_e) {
    const err = _e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return false;
    }

    throw _e;
  }
};

const readRequirements = async (): Promise<Array<Record<string, string>>> => {
  return JSON.parse((await fs.readFile(REQUIREMENTS)).toString());
};

export const checkPythonEnv = async (log: LoggerFn) => {
  if (!(await exists(ENV_DIR))) {
    log("Creating Python environment...");
    await fs.mkdir(ENV_DIR);
    await execPython(["-m", "venv", ENV_DIR], true);
  }

  let isValidDeps = false;
  const pyDeps = Object.entries(pythonDependencies);
  if (await exists(REQUIREMENTS)) {
    log("Checking Python dependencies...");
    try {
      const requirements = (await readRequirements()).reduce((memo, { name, version }) => {
        memo[name] = version;
        return memo;
      }, {});

      isValidDeps = pyDeps.every(([pkg, ver]) => {
        return requirements[pkg] === ver;
      });
    } catch (_) {
      isValidDeps = false;
    }
  }

  if (!isValidDeps) {
    log("Updating Python dependencies...");
    await Promise.all(
      pyDeps.map(([pkg, ver]) => {
        return runPip(["install", "--upgrade", "--force-reinstall", `${pkg}==${ver}`]);
      }),
    );
    const list = await runPip(["list", "-l", "--format", "json"]);
    await fs.writeFile(REQUIREMENTS, list);
  }
};

export const runPythonItermCommand = async (script: string, logger: LoggerFn) => {
  await runAppleScript(
    /* applescript */ `
        tell application "iTerm" to launch
    `,
    () => logger("Launching iTerm..."),
  );

  logger("Running Python script...");
  return await evalPython(script);
};

export async function runPython(script: string, logger: LoggerFn) {
  await checkPythonEnv(logger);
  return runPythonItermCommand(script, logger);
}
