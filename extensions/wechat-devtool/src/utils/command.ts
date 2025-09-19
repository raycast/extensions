import path from "path";
import { mkdir } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

import { REPOSITORY_TYPE, COMMAND, PREVIEW_QRCODE_DIR } from "../constants";
import { RepositoryType } from "../types";

const execAsync = promisify(exec);

export async function openProject(cliPath: string, projectPath: string) {
  const command = `${cliPath} open --project ${JSON.stringify(projectPath)}`;

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

export async function previewProject(cliPath: string, projectPath: string, projectId: string) {
  await mkdir(PREVIEW_QRCODE_DIR, { recursive: true });

  const qrcodePath = path.resolve(PREVIEW_QRCODE_DIR, `${projectId}.png`);

  const command = `${cliPath} preview --project ${JSON.stringify(projectPath)} --qr-size small --qr-format image --qr-output ${qrcodePath}`;
  const { stderr, stdout } = await execAsync(command);

  console.log("🚀 ~ previewProject ~ stdout:", stdout);
  console.log("🚀 ~ previewProject ~ stderr:", stderr);

  const ideStarted =
    stderr && (stderr.includes("IDE server has started") || stderr.includes("IDE server started successfully"));

  if (stderr && !ideStarted) {
    throw new Error(stderr);
  }

  if (stderr && ideStarted && stderr.includes("✔ preview")) {
    return qrcodePath;
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

function getExecEnv() {
  return { ...process.env, PATH: joinHomebrewPath() };
}

function joinHomebrewPath() {
  return [process.env.PATH, "/usr/local/bin", "/opt/homebrew/bin", "/opt/homebrew/sbin"].filter(Boolean).join(":");
}
