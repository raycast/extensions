import fs from "fs";
import os from "os";
import path from "path";
import { randomBytes } from "crypto";
import { environment, getPreferenceValues } from "@raycast/api";
import {
  buildHookCommand,
  CLAUDECAST_HOOK_MARKER,
  hasClaudeCastHook,
  installClaudeCastHook,
  isSafeQuestionFileName,
  QUESTION_SCHEMA_VERSION,
  uninstallClaudeCastHook,
  validateInboxRequest,
  validateInboxResponse,
  validateQuestionResponse,
  type ClaudeAgentWaitingRequest,
  type ClaudeInboxRequest,
  type ClaudeInboxResponse,
  type ClaudePermissionRequest,
  type ClaudePlanRequest,
  type ClaudeQuestionRequest,
  type ClaudeQuestionResponse,
} from "./ask-user-question-core";
import { getClaudeConfigDirectory } from "./platform";

const MAX_INBOX_FILE_BYTES = 256 * 1024;
const BACKUP_SUFFIX = ".claudecast-backup";
const SETTINGS_LOCK_FILE = "settings.lock";
const SETTINGS_LOCK_STALE_MS = 30_000;
const SETTINGS_LOCK_TIMEOUT_MS = 5_000;

export interface ClaudeHookStatus {
  installed: boolean;
  settingsPath: string;
  runnerPath: string;
  error?: string;
}

export interface ClaudeQuestionPaths {
  root: string;
  requests: string;
  responses: string;
  runner: string;
}

export function getClaudeQuestionPaths(
  supportPath = environment.supportPath,
): ClaudeQuestionPaths {
  const root = path.join(supportPath, "ask-user-question");
  return {
    root,
    requests: path.join(root, "requests"),
    responses: path.join(root, "responses"),
    runner: path.join(root, CLAUDECAST_HOOK_MARKER),
  };
}

export function getClaudeSettingsPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  return path.join(
    getClaudeConfigDirectory(
      os.homedir(),
      process.env,
      preferences.claudeConfigPath,
    ),
    "settings.json",
  );
}

export async function getClaudeHookStatus(): Promise<ClaudeHookStatus> {
  const settingsPath = getClaudeSettingsPath();
  const runnerPath = getClaudeQuestionPaths().runner;
  try {
    const settings = await readSettings(settingsPath);
    const expectedCommand = buildHookCommand(runnerPath);
    let runnerInstalled = false;
    try {
      const stat = await fs.promises.lstat(runnerPath);
      runnerInstalled = stat.isFile() && !stat.isSymbolicLink();
    } catch {
      runnerInstalled = false;
    }
    return {
      installed:
        runnerInstalled && hasClaudeCastHook(settings, expectedCommand),
      settingsPath,
      runnerPath,
    };
  } catch (error) {
    return {
      installed: false,
      settingsPath,
      runnerPath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function installClaudeQuestionHook(): Promise<ClaudeHookStatus> {
  const settingsPath = getClaudeSettingsPath();
  const questionPaths = getClaudeQuestionPaths();
  await installHookRunner(questionPaths);
  await withSettingsLock(questionPaths.root, async () => {
    const settings = await readSettings(settingsPath);
    const command = buildHookCommand(questionPaths.runner);
    const update = installClaudeCastHook(settings, command);
    if (update.changed) {
      await backupSettingsOnce(settingsPath);
      await atomicWriteSettings(settingsPath, update.settings);
    }
  });
  return getClaudeHookStatus();
}

export async function uninstallClaudeQuestionHook(): Promise<ClaudeHookStatus> {
  const settingsPath = getClaudeSettingsPath();
  const questionPaths = getClaudeQuestionPaths();
  await withSettingsLock(questionPaths.root, async () => {
    const settings = await readSettings(settingsPath);
    const update = uninstallClaudeCastHook(settings);
    if (update.changed) {
      await atomicWriteSettings(settingsPath, update.settings);
    }
  });
  return getClaudeHookStatus();
}

export async function loadPendingClaudeInbox(): Promise<ClaudeInboxRequest[]> {
  const questionPaths = getClaudeQuestionPaths();
  await ensurePrivateDirectory(questionPaths.requests);
  await ensurePrivateDirectory(questionPaths.responses);
  let entries: string[];
  try {
    entries = await fs.promises.readdir(questionPaths.requests);
  } catch {
    return [];
  }

  const requests: ClaudeInboxRequest[] = [];
  for (const entry of entries) {
    if (!isSafeQuestionFileName(entry)) continue;
    const filePath = safeQuestionPath(
      questionPaths.requests,
      entry.slice(0, -5),
    );
    try {
      const stat = await fs.promises.lstat(filePath);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.size > MAX_INBOX_FILE_BYTES
      ) {
        continue;
      }
      const value: unknown = JSON.parse(
        await fs.promises.readFile(filePath, "utf8"),
      );
      requests.push(validateInboxRequest(value));
    } catch {
      continue;
    }
  }
  return requests.sort((left, right) => {
    const timeDifference =
      Date.parse(left.createdAt) - Date.parse(right.createdAt);
    return timeDifference || left.requestId.localeCompare(right.requestId);
  });
}

export async function loadPendingClaudeQuestions(): Promise<
  ClaudeQuestionRequest[]
> {
  return (await loadPendingClaudeInbox()).filter(
    (request): request is ClaudeQuestionRequest =>
      request.eventType === "question",
  );
}

export async function answerClaudeQuestion(
  request: ClaudeQuestionRequest,
  answers: Record<string, string>,
): Promise<void> {
  const response = validateQuestionResponse(
    buildResponse(request, "answered", { answers }),
    request,
  );
  await publishInboxResponse(request, response);
}

export async function cancelClaudeQuestion(
  request: ClaudeQuestionRequest,
): Promise<void> {
  const response = validateQuestionResponse(
    buildResponse(request, "cancelled"),
    request,
  );
  await publishInboxResponse(request, response);
}

export async function allowClaudePermission(
  request: ClaudePermissionRequest,
): Promise<void> {
  await publishValidatedResponse(request, buildResponse(request, "allowed"));
}

export async function denyClaudePermission(
  request: ClaudePermissionRequest,
  reason: string,
): Promise<void> {
  await publishValidatedResponse(
    request,
    buildResponse(request, "denied", { reason }),
  );
}

export async function approveClaudePlan(
  request: ClaudePlanRequest,
): Promise<void> {
  await publishValidatedResponse(request, buildResponse(request, "allowed"));
}

export async function denyClaudePlan(
  request: ClaudePlanRequest,
  reason: string,
): Promise<void> {
  await publishValidatedResponse(
    request,
    buildResponse(request, "denied", { reason }),
  );
}

export async function deferClaudePlan(
  request: ClaudePlanRequest,
): Promise<void> {
  await publishValidatedResponse(request, buildResponse(request, "deferred"));
}

export async function dismissAgentWaiting(
  request: ClaudeAgentWaitingRequest,
): Promise<void> {
  const requestPath = safeQuestionPath(
    getClaudeQuestionPaths().requests,
    request.requestId,
  );
  await fs.promises.rm(requestPath, { force: true });
}

function buildResponse(
  request: Exclude<ClaudeInboxRequest, ClaudeAgentWaitingRequest>,
  status: ClaudeInboxResponse["status"],
  fields: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    version: QUESTION_SCHEMA_VERSION,
    requestId: request.requestId,
    nonce: request.nonce,
    status,
    answeredAt: new Date().toISOString(),
    ...fields,
  };
}

async function publishValidatedResponse(
  request: ClaudePermissionRequest | ClaudePlanRequest,
  value: unknown,
): Promise<void> {
  const response = validateInboxResponse(value, request);
  await publishInboxResponse(request, response);
}

async function publishInboxResponse(
  request: Exclude<ClaudeInboxRequest, ClaudeAgentWaitingRequest>,
  response: ClaudeInboxResponse | ClaudeQuestionResponse,
): Promise<void> {
  const questionPaths = getClaudeQuestionPaths();
  await ensurePrivateDirectory(questionPaths.responses);
  const responsePath = safeQuestionPath(
    questionPaths.responses,
    request.requestId,
  );
  await atomicCreateJson(responsePath, response, 0o600);
  const requestPath = safeQuestionPath(
    questionPaths.requests,
    request.requestId,
  );
  await fs.promises.rm(requestPath, { force: true });
}

async function installHookRunner(paths: ClaudeQuestionPaths): Promise<void> {
  await ensurePrivateDirectory(paths.root);
  await ensurePrivateDirectory(paths.requests);
  await ensurePrivateDirectory(paths.responses);
  const sourcePath = path.join(
    environment.assetsPath,
    "hooks",
    CLAUDECAST_HOOK_MARKER,
  );
  const runner = await fs.promises.readFile(sourcePath);
  await atomicWriteBytes(paths.runner, new Uint8Array(runner), 0o700);
  await fs.promises.chmod(paths.runner, 0o700).catch(() => undefined);
}

async function readSettings(
  settingsPath: string,
): Promise<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(
      await fs.promises.readFile(settingsPath, "utf8"),
    );
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("Claude Settings Must Contain A JSON Object");
    }
    return value as Record<string, unknown>;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return {};
    if (error instanceof SyntaxError) {
      throw new Error(`Claude Settings Contain Invalid JSON: ${settingsPath}`);
    }
    throw error;
  }
}

async function backupSettingsOnce(settingsPath: string): Promise<void> {
  try {
    await fs.promises.access(settingsPath);
  } catch {
    return;
  }
  const backupPath = `${settingsPath}${BACKUP_SUFFIX}`;
  try {
    await fs.promises.copyFile(
      settingsPath,
      backupPath,
      fs.constants.COPYFILE_EXCL,
    );
    await fs.promises.chmod(backupPath, 0o600).catch(() => undefined);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
  }
}

async function atomicWriteSettings(
  settingsPath: string,
  settings: Record<string, unknown>,
): Promise<void> {
  let mode = 0o600;
  try {
    mode = (await fs.promises.stat(settingsPath)).mode & 0o777;
  } catch {
    mode = 0o600;
  }
  await atomicWriteJson(settingsPath, settings, mode);
}

async function atomicWriteJson(
  filePath: string,
  value: unknown,
  mode: number,
): Promise<void> {
  await atomicWriteBytes(
    filePath,
    new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`),
    mode,
  );
}

async function atomicCreateJson(
  filePath: string,
  value: unknown,
  mode: number,
): Promise<void> {
  const bytes = new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
  await ensurePrivateDirectory(path.dirname(filePath));
  const temporaryPath = temporaryFilePath(filePath);
  const handle = await fs.promises.open(temporaryPath, "wx", mode);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await fs.promises.link(temporaryPath, filePath);
    await fs.promises.chmod(filePath, mode).catch(() => undefined);
  } finally {
    await fs.promises.rm(temporaryPath, { force: true });
  }
}

async function atomicWriteBytes(
  filePath: string,
  value: Uint8Array,
  mode: number,
): Promise<void> {
  await ensurePrivateDirectory(path.dirname(filePath));
  const temporaryPath = temporaryFilePath(filePath);
  const handle = await fs.promises.open(temporaryPath, "wx", mode);
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await fs.promises.rename(temporaryPath, filePath);
    await fs.promises.chmod(filePath, mode).catch(() => undefined);
  } catch (error) {
    await fs.promises.rm(temporaryPath, { force: true });
    throw error;
  }
}

function temporaryFilePath(filePath: string): string {
  return `${filePath}.${process.pid}.${randomBytes(12).toString("hex")}.tmp`;
}

async function ensurePrivateDirectory(directoryPath: string): Promise<void> {
  await fs.promises.mkdir(directoryPath, { recursive: true, mode: 0o700 });
  const stat = await fs.promises.lstat(directoryPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("Permission Inbox Directory Is Invalid");
  }
  await fs.promises.chmod(directoryPath, 0o700).catch(() => undefined);
}

function safeQuestionPath(directoryPath: string, requestId: string): string {
  const fileName = `${requestId}.json`;
  if (!isSafeQuestionFileName(fileName)) {
    throw new Error("Inbox Request ID Is Invalid");
  }
  const resolvedDirectory = path.resolve(directoryPath);
  const resolvedPath = path.resolve(resolvedDirectory, fileName);
  if (path.dirname(resolvedPath) !== resolvedDirectory) {
    throw new Error("Inbox Request Path Is Invalid");
  }
  return resolvedPath;
}

async function withSettingsLock<T>(
  rootDirectory: string,
  action: () => Promise<T>,
): Promise<T> {
  await ensurePrivateDirectory(rootDirectory);
  const lockPath = path.join(rootDirectory, SETTINGS_LOCK_FILE);
  const startedAt = Date.now();
  let handle: fs.promises.FileHandle | undefined;
  while (!handle) {
    try {
      handle = await fs.promises.open(lockPath, "wx", 0o600);
      await handle.writeFile(String(process.pid));
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
      try {
        const stat = await fs.promises.stat(lockPath);
        if (Date.now() - stat.mtimeMs > SETTINGS_LOCK_STALE_MS) {
          await fs.promises.rm(lockPath, { force: true });
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() - startedAt >= SETTINGS_LOCK_TIMEOUT_MS) {
        throw new Error("Timed Out Waiting for Claude Settings Lock");
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  try {
    return await action();
  } finally {
    await handle.close();
    await fs.promises.rm(lockPath, { force: true });
  }
}
