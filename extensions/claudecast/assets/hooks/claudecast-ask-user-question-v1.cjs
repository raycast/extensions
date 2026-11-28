"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const childProcess = require("node:child_process");

const VERSION = 2;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const AGENT_NOTICE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_POLL_MS = 250;
const MAX_INPUT_BYTES = 1024 * 1024;
const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_TOOL_INPUT_BYTES = 32 * 1024;
const MAX_QUESTION_INPUT_BYTES = 128 * 1024;
const MAX_TOOL_INPUT_DEPTH = 8;
const MAX_TOOL_INPUT_KEYS = 100;
const MAX_TOOL_INPUT_ARRAY_ITEMS = 100;
const MAX_TOOL_INPUT_STRING_LENGTH = 12_000;
const MAX_TOOL_INPUT_PREVIEW_LENGTH = 16_000;
const STALE_FILE_MS = 24 * 60 * 60 * 1000;
const RESPONSE_CLOCK_SKEW_MS = 60 * 1000;
const REQUEST_FILE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.json$/i;

async function runClaudeCastQuestionHook(options = {}) {
  const raw = options.raw;
  const rootDirectory = options.rootDirectory || __dirname;
  const timeoutMs = options.timeoutMs ?? readTimeout();
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const openRaycast = options.openRaycast || openRaycastCommand;

  let parsed;
  try {
    parsed = parseHookInput(raw);
  } catch (error) {
    const requestLabel =
      isObject(raw) && raw.hook_event_name === "PreToolUse"
        ? "AskUserQuestion or plan"
        : "permission inbox";
    return failureForInput(
      raw,
      `ClaudeCast rejected an invalid ${requestLabel} request: ${safeErrorMessage(error)}`,
    );
  }

  const requestsDirectory = path.join(rootDirectory, "requests");
  const responsesDirectory = path.join(rootDirectory, "responses");
  try {
    await ensurePrivateDirectory(rootDirectory);
    await ensurePrivateDirectory(requestsDirectory);
    await ensurePrivateDirectory(responsesDirectory);
    await Promise.all([
      cleanupStaleFiles(requestsDirectory),
      cleanupStaleFiles(responsesDirectory),
    ]);
  } catch {
    return failureForParsed(
      parsed,
      "ClaudeCast could not prepare the private permission inbox.",
    );
  }

  if (parsed.eventType === "agent_completed") {
    await removeAgentWaitingRequests(requestsDirectory, parsed.sessionId);
    return {};
  }

  if (parsed.eventType === "agent_waiting") {
    await removeAgentWaitingRequests(requestsDirectory, parsed.sessionId);
  }

  const requestId = crypto.randomUUID();
  const nonce = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresIn =
    parsed.eventType === "agent_waiting" ? AGENT_NOTICE_TTL_MS : timeoutMs;
  const request = buildRequest(parsed, requestId, nonce, now, now + expiresIn);
  const requestPath = safeRequestPath(requestsDirectory, requestId);
  const responsePath = safeRequestPath(responsesDirectory, requestId);

  try {
    await fs.promises.rm(responsePath, { force: true });
    await atomicWriteJson(requestPath, request);
  } catch {
    return failureForParsed(
      parsed,
      "ClaudeCast could not publish the permission inbox request.",
    );
  }

  if (parsed.eventType === "agent_waiting") {
    try {
      await openRaycast(requestId);
    } catch {
      // The queued item remains available when Raycast is opened later.
    }
    return {};
  }

  try {
    try {
      await openRaycast(requestId);
    } catch {
      return failureForParsed(
        parsed,
        "ClaudeCast could not open Raycast. Respond in the terminal instead.",
      );
    }

    const response = await waitForResponse(
      responsePath,
      request,
      timeoutMs,
      pollMs,
    );
    if (response === null) {
      return failureForParsed(
        parsed,
        "ClaudeCast timed out while waiting for a Raycast response. Respond in the terminal instead.",
      );
    }
    return responseOutput(parsed, response);
  } catch (error) {
    return failureForParsed(
      parsed,
      `ClaudeCast could not read the Raycast response: ${safeErrorMessage(error)}`,
    );
  } finally {
    await Promise.all([
      fs.promises.rm(requestPath, { force: true }),
      fs.promises.rm(responsePath, { force: true }),
    ]);
  }
}

function parseHookInput(value) {
  if (!isObject(value)) throw new Error("hook input must be an object");
  const common = parseCommonInput(value);

  if (value.hook_event_name === "PreToolUse") {
    if (!isObject(value.tool_input)) {
      throw new Error("tool_input must be an object");
    }
    const toolUseId = requiredIdentifier(value.tool_use_id, "tool_use_id");
    if (value.tool_name === "AskUserQuestion") {
      if (JSON.stringify(value.tool_input).length > MAX_QUESTION_INPUT_BYTES) {
        throw new Error("question tool input is too large");
      }
      return {
        ...common,
        eventType: "question",
        toolUseId,
        questions: parseQuestions(value.tool_input.questions),
        originalToolInput: { ...value.tool_input },
      };
    }
    if (value.tool_name === "ExitPlanMode") {
      validatePlanToolInput(value.tool_input);
      return {
        ...common,
        eventType: "plan",
        toolUseId,
        plan: requiredString(value.tool_input.plan, "plan", 64_000),
        planFilePath: requiredString(
          value.tool_input.planFilePath,
          "planFilePath",
          4_000,
        ),
        originalToolInput: { ...value.tool_input },
      };
    }
    throw new Error("PreToolUse tool is unsupported");
  }

  if (value.hook_event_name === "PermissionRequest") {
    const toolInput = validateBoundedJsonObject(
      value.tool_input,
      "permission tool input",
    );
    return {
      ...common,
      eventType: "permission",
      permissionMode: optionalIdentifier(
        value.permission_mode,
        "permission_mode",
        64,
      ),
      toolName: requiredToolName(value.tool_name),
      toolSummary: summarizeToolInput(toolInput),
      toolInputPreview: truncateText(
        JSON.stringify(toolInput, null, 2),
        MAX_TOOL_INPUT_PREVIEW_LENGTH,
      ),
    };
  }

  if (value.hook_event_name === "Notification") {
    const notificationType = requiredString(
      value.notification_type,
      "notification_type",
      100,
    );
    if (
      notificationType !== "agent_needs_input" &&
      notificationType !== "agent_completed"
    ) {
      throw new Error("notification type is unsupported");
    }
    return {
      ...common,
      eventType:
        notificationType === "agent_needs_input"
          ? "agent_waiting"
          : "agent_completed",
      title: optionalString(value.title, 200),
      message: requiredString(value.message, "notification message", 4_000),
    };
  }

  throw new Error("hook event is unsupported");
}

function parseCommonInput(value) {
  return {
    sessionId: requiredIdentifier(value.session_id, "session_id"),
    cwd: requiredString(value.cwd, "cwd", 4_000),
    transcriptPath: requiredString(
      value.transcript_path,
      "transcript_path",
      4_000,
    ),
  };
}

function buildRequest(parsed, requestId, nonce, createdTime, expiresTime) {
  const base = {
    version: VERSION,
    requestId,
    nonce,
    createdAt: new Date(createdTime).toISOString(),
    expiresAt: new Date(expiresTime).toISOString(),
    eventType: parsed.eventType,
    sessionId: parsed.sessionId,
    cwd: parsed.cwd,
    transcriptPath: parsed.transcriptPath,
  };
  if (parsed.eventType === "question") {
    return {
      ...base,
      toolUseId: parsed.toolUseId,
      questions: parsed.questions,
    };
  }
  if (parsed.eventType === "permission") {
    return withoutUndefined({
      ...base,
      permissionMode: parsed.permissionMode,
      toolName: parsed.toolName,
      toolSummary: parsed.toolSummary,
      toolInputPreview: parsed.toolInputPreview,
    });
  }
  if (parsed.eventType === "plan") {
    return {
      ...base,
      toolUseId: parsed.toolUseId,
      plan: parsed.plan,
      planFilePath: parsed.planFilePath,
    };
  }
  return withoutUndefined({
    ...base,
    title: parsed.title,
    message: parsed.message,
  });
}

function parseQuestions(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) {
    throw new Error("questions must contain one to four items");
  }
  const seen = new Set();
  return value.map((item) => {
    if (!isObject(item)) throw new Error("question must be an object");
    const question = requiredString(item.question, "question", 4_000);
    if (seen.has(question)) throw new Error("question text must be unique");
    seen.add(question);
    if (
      item.multiSelect !== undefined &&
      typeof item.multiSelect !== "boolean"
    ) {
      throw new Error("multiSelect must be boolean");
    }
    return {
      question,
      header: optionalString(item.header, 100),
      options: item.options === undefined ? [] : parseOptions(item.options),
      multiSelect: item.multiSelect === true,
    };
  });
}

function parseOptions(value) {
  if (!Array.isArray(value) || value.length > 20) {
    throw new Error("options must contain at most 20 items");
  }
  const seen = new Set();
  return value.map((item) => {
    if (!isObject(item)) throw new Error("option must be an object");
    const label = requiredString(item.label, "option label", 500);
    if (seen.has(label)) throw new Error("option labels must be unique");
    seen.add(label);
    return {
      label,
      description: optionalString(item.description, 2_000),
    };
  });
}

function validateBoundedJsonObject(value, label) {
  if (!isObject(value)) throw new Error(`${label} must be an object`);
  let keys = 0;
  validateJsonValue(value, label, 0, () => {
    keys += 1;
    if (keys > MAX_TOOL_INPUT_KEYS) {
      throw new Error(`${label} contains too many fields`);
    }
  });
  if (JSON.stringify(value).length > MAX_TOOL_INPUT_BYTES) {
    throw new Error(`${label} is too large`);
  }
  return value;
}

function validatePlanToolInput(value) {
  requiredString(value.plan, "plan", 64_000);
  requiredString(value.planFilePath, "planFilePath", 4_000);
  const remainingInput = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "plan"),
  );
  validateBoundedJsonObject(remainingInput, "plan tool input");
}

function validateJsonValue(value, label, depth, countKey) {
  if (depth > MAX_TOOL_INPUT_DEPTH) {
    throw new Error(`${label} is nested too deeply`);
  }
  if (
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return;
  }
  if (typeof value === "string") {
    if (value.length > MAX_TOOL_INPUT_STRING_LENGTH) {
      throw new Error(`${label} contains text that is too long`);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_TOOL_INPUT_ARRAY_ITEMS) {
      throw new Error(`${label} contains too many array items`);
    }
    for (const item of value) {
      validateJsonValue(item, label, depth + 1, countKey);
    }
    return;
  }
  if (!isObject(value)) throw new Error(`${label} contains a non-JSON value`);
  for (const [key, item] of Object.entries(value)) {
    countKey();
    if (!key || key.length > 256 || isUnsafeObjectKey(key)) {
      throw new Error(`${label} contains an invalid field name`);
    }
    validateJsonValue(item, label, depth + 1, countKey);
  }
}

async function waitForResponse(responsePath, request, timeoutMs, pollMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const response = await readResponse(responsePath, request);
    if (response !== undefined) return response;
    await delay(pollMs);
  }
  return null;
}

async function readResponse(responsePath, request) {
  let stat;
  try {
    stat = await fs.promises.lstat(responsePath);
  } catch (error) {
    if (error && error.code === "ENOENT") return undefined;
    throw error;
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size > MAX_RESPONSE_BYTES
  ) {
    throw new Error("response file is invalid");
  }
  const value = JSON.parse(await fs.promises.readFile(responsePath, "utf8"));
  return validateResponse(value, request);
}

function validateResponse(value, request, now = Date.now()) {
  if (!isObject(value) || value.version !== VERSION) {
    throw new Error("response version is invalid");
  }
  if (value.requestId !== request.requestId || value.nonce !== request.nonce) {
    throw new Error("response identity does not match");
  }
  if (
    typeof value.answeredAt !== "string" ||
    !Number.isFinite(Date.parse(value.answeredAt))
  ) {
    throw new Error("response timestamp is invalid");
  }
  const answeredTime = Date.parse(value.answeredAt);
  if (
    answeredTime < Date.parse(request.createdAt) - RESPONSE_CLOCK_SKEW_MS ||
    answeredTime > now + RESPONSE_CLOCK_SKEW_MS ||
    now > Date.parse(request.expiresAt) + RESPONSE_CLOCK_SKEW_MS
  ) {
    throw new Error("response timestamp is outside the request lifetime");
  }

  if (request.eventType === "question") {
    return validateQuestionResponse(value, request);
  }
  if (request.eventType === "permission") {
    if (value.status !== "allowed" && value.status !== "denied") {
      throw new Error("permission response status is invalid");
    }
    return {
      status: value.status,
      reason:
        value.status === "denied"
          ? requiredString(value.reason, "denial reason", 4_000)
          : undefined,
    };
  }
  if (request.eventType === "plan") {
    if (
      value.status !== "allowed" &&
      value.status !== "denied" &&
      value.status !== "deferred"
    ) {
      throw new Error("plan response status is invalid");
    }
    return {
      status: value.status,
      reason:
        value.status === "denied"
          ? requiredString(value.reason, "denial reason", 4_000)
          : undefined,
    };
  }
  throw new Error("request event cannot receive a response");
}

function validateQuestionResponse(value, request) {
  if (value.status !== "answered" && value.status !== "cancelled") {
    throw new Error("question response status is invalid");
  }
  if (value.status === "cancelled") {
    return { status: "cancelled" };
  }
  if (!isObject(value.answers)) throw new Error("answers must be an object");

  const expected = new Set(request.questions.map((item) => item.question));
  const answers = {};
  for (const [question, answer] of Object.entries(value.answers)) {
    if (!expected.has(question)) throw new Error("answer key is unknown");
    if (typeof answer !== "string" || !answer.trim() || answer.length > 4_000) {
      throw new Error("answer value is invalid");
    }
    answers[question] = answer.trim();
  }
  for (const question of expected) {
    if (answers[question] === undefined) {
      throw new Error("answer is missing");
    }
  }
  return { status: "answered", answers };
}

function responseOutput(parsed, response) {
  if (parsed.eventType === "question") {
    if (response.status === "cancelled") {
      return preToolDeny("The user cancelled the ClaudeCast question.");
    }
    return questionAllow(parsed.originalToolInput, response.answers);
  }
  if (parsed.eventType === "permission") {
    return response.status === "allowed"
      ? permissionAllow()
      : permissionDeny(response.reason);
  }
  if (parsed.eventType === "plan") {
    if (response.status === "allowed") {
      return planAllow(parsed.originalToolInput);
    }
    if (response.status === "deferred") return preToolDefer();
    return preToolDeny(response.reason);
  }
  return {};
}

function questionAllow(originalToolInput, answers) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "Answered Through ClaudeCast",
      updatedInput: {
        ...originalToolInput,
        questions: originalToolInput.questions,
        answers,
      },
    },
  };
}

function planAllow(originalToolInput) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "Plan Approved Through ClaudeCast",
      updatedInput: { ...originalToolInput },
    },
  };
}

function preToolDeny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

function preToolDefer() {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "defer",
    },
  };
}

function permissionAllow() {
  return {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: "allow" },
    },
  };
}

function permissionDeny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: {
        behavior: "deny",
        message: reason,
      },
    },
  };
}

function failureForInput(raw, reason) {
  if (isObject(raw) && raw.hook_event_name === "PermissionRequest") {
    return permissionDeny(reason);
  }
  if (isObject(raw) && raw.hook_event_name === "Notification") return {};
  return preToolDeny(reason);
}

function failureForParsed(parsed, reason) {
  return parsed.eventType === "permission"
    ? permissionDeny(reason)
    : parsed.eventType === "agent_waiting" ||
        parsed.eventType === "agent_completed"
      ? {}
      : preToolDeny(reason);
}

function buildRaycastLaunch(requestId, platform = process.platform) {
  const context = encodeURIComponent(JSON.stringify({ requestId }));
  const url =
    "raycast://extensions/qazi0/claudecast/claude-questions?context=" + context;
  return platform === "win32"
    ? {
        executable: "rundll32.exe",
        args: ["url.dll,FileProtocolHandler", url],
      }
    : { executable: "/usr/bin/open", args: [url] };
}

function openRaycastCommand(requestId) {
  const launch = buildRaycastLaunch(requestId);
  return new Promise((resolve, reject) => {
    childProcess.execFile(
      launch.executable,
      launch.args,
      { windowsHide: true, timeout: 10_000 },
      (error) => (error ? reject(error) : resolve()),
    );
  });
}

async function atomicWriteJson(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const handle = await fs.promises.open(temporaryPath, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await fs.promises.link(temporaryPath, filePath);
    await fs.promises.chmod(filePath, 0o600).catch(() => undefined);
  } finally {
    await fs.promises.rm(temporaryPath, { force: true });
  }
}

async function ensurePrivateDirectory(directoryPath) {
  await fs.promises.mkdir(directoryPath, { recursive: true, mode: 0o700 });
  const stat = await fs.promises.lstat(directoryPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("permission inbox directory is invalid");
  }
  await fs.promises.chmod(directoryPath, 0o700).catch(() => undefined);
}

function safeRequestPath(directoryPath, requestId) {
  const fileName = `${requestId}.json`;
  if (!REQUEST_FILE_PATTERN.test(fileName)) {
    throw new Error("request ID is invalid");
  }
  const resolvedDirectory = path.resolve(directoryPath);
  const resolvedPath = path.resolve(resolvedDirectory, fileName);
  if (path.dirname(resolvedPath) !== resolvedDirectory) {
    throw new Error("request path is invalid");
  }
  return resolvedPath;
}

async function cleanupStaleFiles(directoryPath) {
  let entries;
  try {
    entries = await fs.promises.readdir(directoryPath);
  } catch {
    return;
  }
  const cutoff = Date.now() - STALE_FILE_MS;
  for (const entry of entries) {
    if (!REQUEST_FILE_PATTERN.test(entry)) continue;
    const filePath = path.join(directoryPath, entry);
    try {
      const stat = await fs.promises.lstat(filePath);
      if (stat.isFile() && !stat.isSymbolicLink() && stat.mtimeMs < cutoff) {
        await fs.promises.rm(filePath, { force: true });
      }
    } catch {
      continue;
    }
  }
}

async function removeAgentWaitingRequests(directoryPath, sessionId) {
  let entries;
  try {
    entries = await fs.promises.readdir(directoryPath);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!REQUEST_FILE_PATTERN.test(entry)) continue;
    const filePath = path.join(directoryPath, entry);
    try {
      const stat = await fs.promises.lstat(filePath);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.size > MAX_REQUEST_BYTES
      ) {
        continue;
      }
      const value = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
      if (
        isObject(value) &&
        value.version === VERSION &&
        value.eventType === "agent_waiting" &&
        value.sessionId === sessionId
      ) {
        await fs.promises.rm(filePath, { force: true });
      }
    } catch {
      continue;
    }
  }
}

function readTimeout() {
  const value = Number(process.env.CLAUDECAST_QUESTION_TIMEOUT_MS);
  if (!Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.min(10 * 60 * 1000, Math.max(1_000, Math.floor(value)));
}

function requiredIdentifier(value, label) {
  const identifier = requiredString(value, label, 256);
  if (/\p{Cc}/u.test(identifier)) throw new Error(`${label} is invalid`);
  return identifier;
}

function requiredToolName(value) {
  const toolName = requiredString(value, "tool_name", 256);
  if (!/^[A-Za-z0-9_.:-]+$/.test(toolName)) {
    throw new Error("tool_name is invalid");
  }
  return toolName;
}

function requiredString(value, label, maxLength) {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`${label} is invalid`);
  }
  return normalized;
}

function optionalString(value, maxLength) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error("optional field must be text");
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > maxLength)
    throw new Error("optional field is too long");
  return normalized;
}

function optionalIdentifier(value, label, maxLength) {
  const identifier = optionalString(value, maxLength);
  if (identifier !== undefined && /\p{Cc}/u.test(identifier)) {
    throw new Error(`${label} is invalid`);
  }
  return identifier;
}

function summarizeToolInput(value) {
  for (const key of [
    "description",
    "command",
    "file_path",
    "path",
    "url",
    "query",
    "prompt",
  ]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return truncateText(candidate.trim(), 2_000);
    }
  }
  return undefined;
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) return value;
  const suffix = "\n[Content Truncated]";
  return `${value.slice(0, maxLength - suffix.length)}${suffix}`;
}

function withoutUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}

function isUnsafeObjectKey(value) {
  return (
    value === "__proto__" || value === "prototype" || value === "constructor"
  );
}

function safeErrorMessage(error) {
  return error instanceof Error ? error.message : "unknown error";
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readStdin() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_INPUT_BYTES) throw new Error("hook input is too large");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

async function main() {
  let raw;
  let output;
  try {
    raw = await readStdin();
    output = await runClaudeCastQuestionHook({ raw });
  } catch (error) {
    output = failureForInput(
      raw,
      `ClaudeCast permission inbox routing failed: ${safeErrorMessage(error)}`,
    );
  }
  process.stdout.write(JSON.stringify(output));
}

module.exports = {
  atomicWriteJson,
  buildRaycastLaunch,
  parseHookInput,
  runClaudeCastInboxHook: runClaudeCastQuestionHook,
  runClaudeCastQuestionHook,
  validateResponse,
};

if (require.main === module) {
  void main();
}
