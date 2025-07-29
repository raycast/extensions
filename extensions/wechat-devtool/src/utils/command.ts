import { exec } from "child_process";
import { promisify } from "util";

import { REPOSITORY_TYPE, COMMAND } from "../constants";
import { RepositoryType } from "../types";

const execAsync = promisify(exec);

function getEnvPathWithBrew() {
  return [process.env.PATH, "/usr/bin", "/usr/local/bin", "/opt/homebrew/bin"].join(":");
}

function getExecEnv() {
  return { ...process.env, PATH: getEnvPathWithBrew() };
}

export async function openProject(cliPath: string, projectPath: string) {
  const command = `${cliPath} open --project ${projectPath}`;

  const { stderr, stdout } = await execAsync(command);

  console.log("🚀 ~ openProject ~ stdout:", stdout);
  console.log("🚀 ~ openProject ~ stderr:", stderr);

  const ideStarted =
    stderr && (stderr.includes("IDE server has started") || stderr.includes("IDE server started successfully"));

  if (stderr && !ideStarted) {
    throw new Error(stderr);
  }

  if (stderr && ideStarted && stderr.includes("✔ open")) {
    return true;
  }

  if (stderr && ideStarted && stderr.includes("✖ preparing")) {
    throw new Error(stderr);
  }

  throw new Error(stderr || stdout);
}

export async function detectRepositoryType(cwd: string): Promise<RepositoryType> {
  const env = getExecEnv();

  try {
    await execAsync(COMMAND.GIT_CHECK, { cwd, env });
    return REPOSITORY_TYPE.GIT;
  } catch {
    // ignore
  }

  try {
    await execAsync(COMMAND.HG_CHECK, { cwd, env });
    return REPOSITORY_TYPE.MERCURIAL;
  } catch {
    // ignore
  }

  return REPOSITORY_TYPE.UNKNOWN;
}

export async function getRepositoryBranch(cwd: string, repositoryType: RepositoryType) {
  if (repositoryType === REPOSITORY_TYPE.UNKNOWN) return null;

  const env = getExecEnv();
  const command = repositoryType === REPOSITORY_TYPE.MERCURIAL ? COMMAND.HG_BRANCH : COMMAND.GIT_BRANCH;
  const { stdout, stderr } = await execAsync(command, { cwd, env });

  if (stderr) return null;
  return stdout.trim();
}
