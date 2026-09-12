import path from "path";
import { mkdir } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

import { runWechatDevtool } from "@/utils";
import { REPOSITORY_TYPE, COMMAND, PREVIEW_QRCODE_DIR, IS_MACOS } from "@/constants";
import type { RepositoryType } from "@/types";

const execAsync = promisify(exec);

export async function openProject(projectPath: string): Promise<void> {
  await checkLoginStatus();
  const { stderr, stdout } = await runWechatDevtool("open", ["--project", projectPath]);

  console.log("🚀 ~ openProject ~ stdout:", stdout);
  console.log("🚀 ~ openProject ~ stderr:", stderr);

  processExecutionResult({ stderr, stdout, keyword: "open" });
}

export async function previewProject(projectPath: string, projectId: string): Promise<string> {
  await checkLoginStatus();

  await mkdir(PREVIEW_QRCODE_DIR, { recursive: true });

  const qrcodePath = path.resolve(PREVIEW_QRCODE_DIR, `${projectId}.png`);

  const { stderr, stdout } = await runWechatDevtool("preview", [
    "--project",
    projectPath,
    "--qr-size",
    "small",
    "--qr-format",
    "image",
    "--qr-output",
    qrcodePath,
  ]);

  console.log("🚀 ~ previewProject ~ stdout:", stdout);
  console.log("🚀 ~ previewProject ~ stderr:", stderr);

  processExecutionResult({ stderr, stdout, keyword: "preview" });

  return qrcodePath;
}

export async function checkLoginStatus(shouldThrowErrorWhenNotLoggedIn = true) {
  const { stdout } = await runWechatDevtool("islogin");
  // {"login":false} or {"login":true}
  const loggedIn = stdout.includes("true");

  if (shouldThrowErrorWhenNotLoggedIn && !loggedIn) {
    throw new Error("Not logged in");
  }

  return loggedIn;
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
  return { ...process.env, PATH: IS_MACOS ? joinHomebrewPath() : undefined };
}

function joinHomebrewPath() {
  return [process.env.PATH, "/usr/local/bin", "/opt/homebrew/bin", "/opt/homebrew/sbin"].filter(Boolean).join(":");
}

function processExecutionResult({
  stderr,
  stdout,
  keyword,
}: {
  stderr: string;
  stdout: string;
  keyword: string;
}): boolean {
  const ideStarted =
    stderr && (stderr.includes("IDE server has started") || stderr.includes("IDE server started successfully"));

  if (stderr && !ideStarted) {
    throw new Error(stderr);
  }

  if (stderr && ideStarted) {
    const successKeywords = [`✔ ${keyword}`, `√ ${keyword}`];
    const succeeded = successKeywords.some((keyword) => stderr.includes(keyword));
    if (succeeded) {
      return true;
    }

    const failureKeywords = ["✖ preparing", "× preparing"];
    const failed = failureKeywords.some((keyword) => stderr.includes(keyword));
    if (failed) {
      throw new Error(stderr);
    }
  }

  throw new Error(stderr || stdout);
}
