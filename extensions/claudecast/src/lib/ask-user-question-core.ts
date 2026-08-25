export const CLAUDECAST_HOOK_MARKER = "claudecast-ask-user-question-v1.cjs";
export const QUESTION_SCHEMA_VERSION = 2;
export const QUESTION_TIMEOUT_MS = 5 * 60 * 1000;
export const AGENT_NOTICE_TTL_MS = 24 * 60 * 60 * 1000;
export const QUESTION_MAX_COUNT = 4;

const MAX_ID_LENGTH = 256;
const MAX_PATH_LENGTH = 4_000;
const MAX_TOOL_NAME_LENGTH = 256;
const MAX_TOOL_INPUT_DEPTH = 8;
const MAX_TOOL_INPUT_KEYS = 100;
const MAX_TOOL_INPUT_ARRAY_ITEMS = 100;
const MAX_TOOL_INPUT_STRING_LENGTH = 12_000;
const MAX_TOOL_INPUT_SERIALIZED_LENGTH = 32_000;
const MAX_QUESTION_INPUT_SERIALIZED_LENGTH = 128_000;
const MAX_TOOL_INPUT_PREVIEW_LENGTH = 16_000;
const MAX_PLAN_LENGTH = 64_000;
const MAX_NOTIFICATION_MESSAGE_LENGTH = 4_000;
const MAX_REASON_LENGTH = 4_000;
const RESPONSE_CLOCK_SKEW_MS = 60_000;

export type ClaudeInboxEventType =
  | "question"
  | "permission"
  | "plan"
  | "agent_waiting";

export interface ClaudeQuestionOption {
  label: string;
  description?: string;
}

export interface ClaudeQuestion {
  question: string;
  header?: string;
  options: ClaudeQuestionOption[];
  multiSelect: boolean;
}

interface ClaudeInboxRequestBase {
  version: number;
  requestId: string;
  nonce: string;
  createdAt: string;
  expiresAt: string;
  eventType: ClaudeInboxEventType;
  sessionId?: string;
  cwd?: string;
  transcriptPath?: string;
}

export interface ClaudeQuestionRequest extends ClaudeInboxRequestBase {
  eventType: "question";
  toolUseId?: string;
  questions: ClaudeQuestion[];
}

export interface ClaudePermissionRequest extends ClaudeInboxRequestBase {
  eventType: "permission";
  permissionMode?: string;
  toolName: string;
  toolSummary?: string;
  toolInputPreview: string;
}

export interface ClaudePlanRequest extends ClaudeInboxRequestBase {
  eventType: "plan";
  toolUseId?: string;
  plan: string;
  planFilePath: string;
}

export interface ClaudeAgentWaitingRequest extends ClaudeInboxRequestBase {
  eventType: "agent_waiting";
  title?: string;
  message: string;
}

export type ClaudeInboxRequest =
  | ClaudeQuestionRequest
  | ClaudePermissionRequest
  | ClaudePlanRequest
  | ClaudeAgentWaitingRequest;

interface ClaudeResponseBase {
  version: number;
  requestId: string;
  nonce: string;
  answeredAt: string;
}

export interface ClaudeQuestionResponse extends ClaudeResponseBase {
  status: "answered" | "cancelled";
  answers?: Record<string, string>;
}

export interface ClaudePermissionResponse extends ClaudeResponseBase {
  status: "allowed" | "denied";
  reason?: string;
}

export interface ClaudePlanResponse extends ClaudeResponseBase {
  status: "allowed" | "denied" | "deferred";
  reason?: string;
}

export type ClaudeInboxResponse =
  | ClaudeQuestionResponse
  | ClaudePermissionResponse
  | ClaudePlanResponse;

interface CommonHookInput {
  sessionId: string;
  cwd: string;
  transcriptPath: string;
}

export interface AskUserQuestionHookInput extends CommonHookInput {
  eventType: "question";
  toolUseId: string;
  questions: ClaudeQuestion[];
  originalToolInput: Record<string, unknown>;
}

export interface PermissionRequestHookInput extends CommonHookInput {
  eventType: "permission";
  permissionMode?: string;
  toolName: string;
  toolSummary?: string;
  toolInputPreview: string;
}

export interface ExitPlanModeHookInput extends CommonHookInput {
  eventType: "plan";
  toolUseId: string;
  plan: string;
  planFilePath: string;
  originalToolInput: Record<string, unknown>;
}

export interface AgentNotificationHookInput extends CommonHookInput {
  eventType: "agent_waiting" | "agent_completed";
  title?: string;
  message: string;
}

export type ClaudeInboxHookInput =
  | AskUserQuestionHookInput
  | PermissionRequestHookInput
  | ExitPlanModeHookInput
  | AgentNotificationHookInput;

export interface SettingsUpdate {
  settings: Record<string, unknown>;
  changed: boolean;
}

interface HookHandler extends Record<string, unknown> {
  type: "command";
  command: string;
  timeout: number;
  statusMessage: string;
}

interface HookTarget {
  event: "PreToolUse" | "PermissionRequest" | "Notification";
  matcher?: string;
}

const HOOK_TARGETS: HookTarget[] = [
  { event: "PreToolUse", matcher: "AskUserQuestion" },
  { event: "PreToolUse", matcher: "ExitPlanMode" },
  { event: "PermissionRequest" },
  {
    event: "Notification",
    matcher: "agent_needs_input|agent_completed",
  },
];

export function parseAskUserQuestionHookInput(
  value: unknown,
): AskUserQuestionHookInput {
  const parsed = parseClaudeInboxHookInput(value);
  if (parsed.eventType !== "question") {
    throw new Error("Tool Must Be AskUserQuestion");
  }
  return parsed;
}

export function parsePermissionRequestHookInput(
  value: unknown,
): PermissionRequestHookInput {
  const parsed = parseClaudeInboxHookInput(value);
  if (parsed.eventType !== "permission") {
    throw new Error("Hook Event Must Be PermissionRequest");
  }
  return parsed;
}

export function parseExitPlanModeHookInput(
  value: unknown,
): ExitPlanModeHookInput {
  const parsed = parseClaudeInboxHookInput(value);
  if (parsed.eventType !== "plan") {
    throw new Error("Tool Must Be ExitPlanMode");
  }
  return parsed;
}

export function parseAgentNotificationHookInput(
  value: unknown,
): AgentNotificationHookInput {
  const parsed = parseClaudeInboxHookInput(value);
  if (
    parsed.eventType !== "agent_waiting" &&
    parsed.eventType !== "agent_completed"
  ) {
    throw new Error("Notification Type Must Be An Agent Event");
  }
  return parsed;
}

export function parseClaudeInboxHookInput(
  value: unknown,
): ClaudeInboxHookInput {
  if (!isObject(value)) throw new Error("Hook Input Must Be An Object");
  const common = parseCommonHookInput(value);

  if (value.hook_event_name === "PreToolUse") {
    if (!isObject(value.tool_input)) {
      throw new Error("Tool Input Must Be An Object");
    }
    const toolUseId = requiredIdentifier(value.tool_use_id, "Tool Use ID");
    if (value.tool_name === "AskUserQuestion") {
      if (
        serializedJsonLength(value.tool_input, "Question Tool Input") >
        MAX_QUESTION_INPUT_SERIALIZED_LENGTH
      ) {
        throw new Error("Question Tool Input Is Too Large");
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
        plan: requiredString(value.tool_input.plan, "Plan", MAX_PLAN_LENGTH),
        planFilePath: requiredString(
          value.tool_input.planFilePath,
          "Plan File Path",
          MAX_PATH_LENGTH,
        ),
        originalToolInput: { ...value.tool_input },
      };
    }
    throw new Error("PreToolUse Tool Is Unsupported");
  }

  if (value.hook_event_name === "PermissionRequest") {
    const toolName = requiredToolName(value.tool_name);
    const toolInput = validateBoundedJsonObject(
      value.tool_input,
      "Permission Tool Input",
    );
    return {
      ...common,
      eventType: "permission",
      permissionMode: optionalIdentifier(
        value.permission_mode,
        "Permission Mode",
        64,
      ),
      toolName,
      toolSummary: summarizeToolInput(toolInput),
      toolInputPreview: buildToolInputPreview(toolInput),
    };
  }

  if (value.hook_event_name === "Notification") {
    const notificationType = requiredString(
      value.notification_type,
      "Notification Type",
      100,
    );
    if (
      notificationType !== "agent_needs_input" &&
      notificationType !== "agent_completed"
    ) {
      throw new Error("Notification Type Must Be An Agent Event");
    }
    return {
      ...common,
      eventType:
        notificationType === "agent_needs_input"
          ? "agent_waiting"
          : "agent_completed",
      title: optionalString(value.title, 200),
      message: requiredString(
        value.message,
        "Notification Message",
        MAX_NOTIFICATION_MESSAGE_LENGTH,
      ),
    };
  }

  throw new Error("Hook Event Is Unsupported");
}

export function validateInboxRequest(
  value: unknown,
  now = Date.now(),
): ClaudeInboxRequest {
  if (!isObject(value)) throw new Error("Inbox Request Must Be An Object");
  if (value.version !== QUESTION_SCHEMA_VERSION) {
    throw new Error("Inbox Request Version Is Unsupported");
  }
  const eventType =
    value.eventType === undefined && Array.isArray(value.questions)
      ? "question"
      : value.eventType;
  if (
    eventType !== "question" &&
    eventType !== "permission" &&
    eventType !== "plan" &&
    eventType !== "agent_waiting"
  ) {
    throw new Error("Inbox Request Event Type Is Invalid");
  }
  const base = validateRequestBase(value, eventType, now);

  if (eventType === "question") {
    return {
      ...base,
      eventType,
      toolUseId: optionalIdentifier(
        value.toolUseId,
        "Tool Use ID",
        MAX_ID_LENGTH,
      ),
      questions: parseQuestions(value.questions),
    };
  }
  if (eventType === "permission") {
    return {
      ...base,
      eventType,
      permissionMode: optionalIdentifier(
        value.permissionMode,
        "Permission Mode",
        64,
      ),
      toolName: requiredToolName(value.toolName),
      toolSummary: optionalString(value.toolSummary, 2_000),
      toolInputPreview: requiredString(
        value.toolInputPreview,
        "Tool Input Preview",
        MAX_TOOL_INPUT_PREVIEW_LENGTH,
        false,
      ),
    };
  }
  if (eventType === "plan") {
    return {
      ...base,
      eventType,
      toolUseId: optionalIdentifier(
        value.toolUseId,
        "Tool Use ID",
        MAX_ID_LENGTH,
      ),
      plan: requiredString(value.plan, "Plan", MAX_PLAN_LENGTH),
      planFilePath: requiredString(
        value.planFilePath,
        "Plan File Path",
        MAX_PATH_LENGTH,
      ),
    };
  }
  return {
    ...base,
    eventType,
    title: optionalString(value.title, 200),
    message: requiredString(
      value.message,
      "Notification Message",
      MAX_NOTIFICATION_MESSAGE_LENGTH,
    ),
  };
}

export function validateQuestionRequest(
  value: unknown,
  now = Date.now(),
): ClaudeQuestionRequest {
  const request = validateInboxRequest(value, now);
  if (request.eventType !== "question") {
    throw new Error("Inbox Request Is Not A Question");
  }
  return request;
}

export function validateInboxResponse(
  value: unknown,
  request: Exclude<ClaudeInboxRequest, ClaudeAgentWaitingRequest>,
  now = Date.now(),
): ClaudeInboxResponse {
  if (!isObject(value)) throw new Error("Inbox Response Must Be An Object");
  if (value.version !== QUESTION_SCHEMA_VERSION) {
    throw new Error("Inbox Response Version Is Unsupported");
  }
  if (requiredRequestId(value.requestId) !== request.requestId) {
    throw new Error("Inbox Response Request ID Does Not Match");
  }
  if (requiredHex(value.nonce, "Inbox Response Nonce", 64) !== request.nonce) {
    throw new Error("Inbox Response Nonce Does Not Match");
  }
  const answeredAt = requiredDate(value.answeredAt, "Inbox Response Time");
  const answeredTime = Date.parse(answeredAt);
  if (
    answeredTime < Date.parse(request.createdAt) - RESPONSE_CLOCK_SKEW_MS ||
    answeredTime > now + RESPONSE_CLOCK_SKEW_MS ||
    now > Date.parse(request.expiresAt) + RESPONSE_CLOCK_SKEW_MS
  ) {
    throw new Error("Inbox Response Time Is Invalid");
  }

  if (request.eventType === "question") {
    return validateAnswers(value, request, answeredAt);
  }
  if (request.eventType === "permission") {
    if (value.status !== "allowed" && value.status !== "denied") {
      throw new Error("Permission Response Status Is Invalid");
    }
    return {
      version: QUESTION_SCHEMA_VERSION,
      requestId: request.requestId,
      nonce: request.nonce,
      status: value.status,
      answeredAt,
      reason:
        value.status === "denied"
          ? requiredString(value.reason, "Denial Reason", MAX_REASON_LENGTH)
          : undefined,
    };
  }
  if (
    value.status !== "allowed" &&
    value.status !== "denied" &&
    value.status !== "deferred"
  ) {
    throw new Error("Plan Response Status Is Invalid");
  }
  return {
    version: QUESTION_SCHEMA_VERSION,
    requestId: request.requestId,
    nonce: request.nonce,
    status: value.status,
    answeredAt,
    reason:
      value.status === "denied"
        ? requiredString(value.reason, "Denial Reason", MAX_REASON_LENGTH)
        : undefined,
  };
}

export function validateQuestionResponse(
  value: unknown,
  request: ClaudeQuestionRequest,
  now = Date.now(),
): ClaudeQuestionResponse {
  const response = validateInboxResponse(value, request, now);
  if (response.status !== "answered" && response.status !== "cancelled") {
    throw new Error("Inbox Response Is Not A Question Response");
  }
  return response;
}

export function buildAskUserQuestionAllowOutput(
  originalToolInput: Record<string, unknown>,
  answers: Record<string, string>,
): Record<string, unknown> {
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

export function buildPreToolUseDenyOutput(
  reason: string,
): Record<string, unknown> {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

export const buildAskUserQuestionDenyOutput = buildPreToolUseDenyOutput;

export function buildPlanAllowOutput(
  originalToolInput: Record<string, unknown>,
): Record<string, unknown> {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "Plan Approved Through ClaudeCast",
      updatedInput: { ...originalToolInput },
    },
  };
}

export function buildPlanDeferOutput(): Record<string, unknown> {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "defer",
    },
  };
}

export function buildPermissionAllowOutput(): Record<string, unknown> {
  return {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: "allow" },
    },
  };
}

export function buildPermissionDenyOutput(
  reason: string,
): Record<string, unknown> {
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

export function buildClaudeCastHookHandler(command: string): HookHandler {
  return {
    type: "command",
    command,
    timeout: Math.ceil(QUESTION_TIMEOUT_MS / 1000) + 10,
    statusMessage: "Waiting for Permission Inbox",
  };
}

export function installClaudeCastHook(
  value: unknown,
  command: string,
): SettingsUpdate {
  const settings = parseSettingsRoot(value);
  const hooks = parseHooksRoot(settings.hooks);
  let nextHooks: Record<string, unknown> = { ...hooks };

  for (const event of new Set(HOOK_TARGETS.map((target) => target.event))) {
    const targets = HOOK_TARGETS.filter((target) => target.event === event);
    nextHooks = {
      ...nextHooks,
      [event]: installHookTargets(
        parseHookGroups(nextHooks[event], event),
        targets,
        command,
      ),
    };
  }

  const nextSettings = { ...settings, hooks: nextHooks };
  const changed = JSON.stringify(settings) !== JSON.stringify(nextSettings);
  return { settings: changed ? nextSettings : settings, changed };
}

export function uninstallClaudeCastHook(value: unknown): SettingsUpdate {
  const settings = parseSettingsRoot(value);
  const hooks = parseHooksRoot(settings.hooks);
  let changed = false;
  const nextHooks: Record<string, unknown> = {};

  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) {
      nextHooks[event] = groups;
      continue;
    }
    nextHooks[event] = groups.map((group) => {
      if (!isObject(group) || !Array.isArray(group.hooks)) return group;
      const nextHandlers = group.hooks.filter(
        (handler) => !isClaudeCastHookHandler(handler),
      );
      if (nextHandlers.length === group.hooks.length) return group;
      changed = true;
      return { ...group, hooks: nextHandlers };
    });
  }

  if (!changed) return { settings, changed: false };
  return {
    settings: { ...settings, hooks: nextHooks },
    changed: true,
  };
}

export function hasClaudeCastHook(
  value: unknown,
  expectedCommand?: string,
): boolean {
  try {
    const settings = parseSettingsRoot(value);
    const hooks = parseHooksRoot(settings.hooks);
    return HOOK_TARGETS.every((target) =>
      parseHookGroups(hooks[target.event], target.event).some(
        (group) =>
          isObject(group) &&
          matcherMatches(group.matcher, target.matcher) &&
          Array.isArray(group.hooks) &&
          group.hooks.some(
            (handler) =>
              isClaudeCastHookHandler(handler) &&
              (!expectedCommand ||
                (isObject(handler) && handler.command === expectedCommand)),
          ),
      ),
    );
  } catch {
    return false;
  }
}

export function buildHookCommand(
  runnerPath: string,
  platform: NodeJS.Platform = process.platform,
): string {
  if (platform === "win32") {
    return `node "${runnerPath.replace(/%/g, "%%")}"`;
  }
  return `node '${runnerPath.replace(/'/g, `'"'"'`)}'`;
}

export function isSafeQuestionFileName(fileName: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.json$/i.test(
    fileName,
  );
}

function validateRequestBase(
  value: Record<string, unknown>,
  eventType: ClaudeInboxEventType,
  now: number,
): ClaudeInboxRequestBase {
  const requestId = requiredRequestId(value.requestId);
  const nonce = requiredHex(value.nonce, "Inbox Request Nonce", 64);
  const createdAt = requiredDate(value.createdAt, "Inbox Creation Time");
  const expiresAt = requiredDate(value.expiresAt, "Inbox Expiration Time");
  const createdTime = Date.parse(createdAt);
  const expiresTime = Date.parse(expiresAt);
  const maxLifetime =
    eventType === "agent_waiting" ? AGENT_NOTICE_TTL_MS : QUESTION_TIMEOUT_MS;
  if (expiresTime <= now) throw new Error("Inbox Request Expired");
  if (
    createdTime > now + RESPONSE_CLOCK_SKEW_MS ||
    expiresTime <= createdTime ||
    expiresTime - createdTime > maxLifetime + 5_000
  ) {
    throw new Error("Inbox Request Lifetime Is Invalid");
  }
  return {
    version: QUESTION_SCHEMA_VERSION,
    requestId,
    nonce,
    createdAt,
    expiresAt,
    eventType,
    sessionId: optionalIdentifier(value.sessionId, "Session ID", MAX_ID_LENGTH),
    cwd: optionalString(value.cwd, MAX_PATH_LENGTH),
    transcriptPath: optionalString(value.transcriptPath, MAX_PATH_LENGTH),
  };
}

function validateAnswers(
  value: Record<string, unknown>,
  request: ClaudeQuestionRequest,
  answeredAt: string,
): ClaudeQuestionResponse {
  if (value.status !== "answered" && value.status !== "cancelled") {
    throw new Error("Question Response Status Is Invalid");
  }
  if (value.status === "cancelled") {
    return {
      version: QUESTION_SCHEMA_VERSION,
      requestId: request.requestId,
      nonce: request.nonce,
      status: "cancelled",
      answeredAt,
    };
  }
  if (!isObject(value.answers)) {
    throw new Error("Question Answers Must Be An Object");
  }

  const expectedQuestions = new Set(
    request.questions.map((question) => question.question),
  );
  const answers: Record<string, string> = {};
  for (const [question, answer] of Object.entries(value.answers)) {
    if (!expectedQuestions.has(question)) {
      throw new Error("Question Response Contains An Unknown Question");
    }
    if (typeof answer !== "string" || !answer.trim() || answer.length > 4_000) {
      throw new Error("Question Response Contains An Invalid Answer");
    }
    answers[question] = answer.trim();
  }
  if (
    request.questions.some(
      (question) => answers[question.question] === undefined,
    )
  ) {
    throw new Error("Question Response Is Missing An Answer");
  }

  return {
    version: QUESTION_SCHEMA_VERSION,
    requestId: request.requestId,
    nonce: request.nonce,
    status: "answered",
    answeredAt,
    answers,
  };
}

function parseCommonHookInput(value: Record<string, unknown>): CommonHookInput {
  return {
    sessionId: requiredIdentifier(value.session_id, "Session ID"),
    cwd: requiredString(value.cwd, "Working Directory", MAX_PATH_LENGTH),
    transcriptPath: requiredString(
      value.transcript_path,
      "Transcript Path",
      MAX_PATH_LENGTH,
    ),
  };
}

function parseQuestions(value: unknown): ClaudeQuestion[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > QUESTION_MAX_COUNT
  ) {
    throw new Error("AskUserQuestion Must Contain One to Four Questions");
  }
  const seen = new Set<string>();
  return value.map((item) => {
    if (!isObject(item)) throw new Error("Question Must Be An Object");
    const question = requiredString(item.question, "Question", 4_000);
    if (seen.has(question)) throw new Error("Question Text Must Be Unique");
    seen.add(question);
    const header = optionalString(item.header, 100);
    const multiSelect = item.multiSelect === true;
    if (
      item.multiSelect !== undefined &&
      typeof item.multiSelect !== "boolean"
    ) {
      throw new Error("Question Multi-Select Flag Must Be Boolean");
    }
    const options =
      item.options === undefined ? [] : parseOptions(item.options);
    return { question, header, options, multiSelect };
  });
}

function parseOptions(value: unknown): ClaudeQuestionOption[] {
  if (!Array.isArray(value) || value.length > 20) {
    throw new Error("Question Options Must Be an Array of at Most 20 Items");
  }
  const seen = new Set<string>();
  return value.map((item) => {
    if (!isObject(item)) throw new Error("Question Option Must Be An Object");
    const label = requiredString(item.label, "Question Option Label", 500);
    if (seen.has(label)) {
      throw new Error("Question Option Labels Must Be Unique");
    }
    seen.add(label);
    return {
      label,
      description: optionalString(item.description, 2_000),
    };
  });
}

function validateBoundedJsonObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!isObject(value)) throw new Error(`${label} Must Be An Object`);
  let keys = 0;
  validateJsonValue(value, label, 0, () => {
    keys += 1;
    if (keys > MAX_TOOL_INPUT_KEYS) {
      throw new Error(`${label} Contains Too Many Fields`);
    }
  });
  if (serializedJsonLength(value, label) > MAX_TOOL_INPUT_SERIALIZED_LENGTH) {
    throw new Error(`${label} Is Too Large`);
  }
  return value;
}

function validatePlanToolInput(value: Record<string, unknown>): void {
  requiredString(value.plan, "Plan", MAX_PLAN_LENGTH);
  requiredString(value.planFilePath, "Plan File Path", MAX_PATH_LENGTH);
  const remainingInput = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "plan"),
  );
  validateBoundedJsonObject(remainingInput, "Plan Tool Input");
}

function serializedJsonLength(value: unknown, label: string): number {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error();
    return serialized.length;
  } catch {
    throw new Error(`${label} Contains A Non-JSON Value`);
  }
}

function validateJsonValue(
  value: unknown,
  label: string,
  depth: number,
  countKey: () => void,
): void {
  if (depth > MAX_TOOL_INPUT_DEPTH) {
    throw new Error(`${label} Is Nested Too Deeply`);
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
      throw new Error(`${label} Contains Text That Is Too Long`);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_TOOL_INPUT_ARRAY_ITEMS) {
      throw new Error(`${label} Contains Too Many Array Items`);
    }
    for (const item of value) {
      validateJsonValue(item, label, depth + 1, countKey);
    }
    return;
  }
  if (!isObject(value)) throw new Error(`${label} Contains A Non-JSON Value`);
  for (const [key, item] of Object.entries(value)) {
    countKey();
    if (!key || key.length > 256 || isUnsafeObjectKey(key)) {
      throw new Error(`${label} Contains An Invalid Field Name`);
    }
    validateJsonValue(item, label, depth + 1, countKey);
  }
}

function summarizeToolInput(
  value: Record<string, unknown>,
): string | undefined {
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

function buildToolInputPreview(value: Record<string, unknown>): string {
  return truncateText(
    JSON.stringify(value, null, 2),
    MAX_TOOL_INPUT_PREVIEW_LENGTH,
  );
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const suffix = "\n[Content Truncated]";
  return `${value.slice(0, maxLength - suffix.length)}${suffix}`;
}

function installHookTargets(
  groups: unknown[],
  targets: HookTarget[],
  command: string,
): unknown[] {
  const placed = new Set<number>();
  const handler = buildClaudeCastHookHandler(command);
  const nextGroups = groups.map((group) => {
    if (!isObject(group) || !Array.isArray(group.hooks)) return group;
    const targetIndex = targets.findIndex((target) =>
      matcherMatches(group.matcher, target.matcher),
    );
    const nextHandlers: unknown[] = [];

    for (const current of group.hooks) {
      if (!isClaudeCastHookHandler(current)) {
        nextHandlers.push(current);
        continue;
      }
      if (targetIndex >= 0 && !placed.has(targetIndex)) {
        nextHandlers.push(
          isObject(current) ? { ...current, ...handler } : handler,
        );
        placed.add(targetIndex);
      }
    }

    if (targetIndex >= 0 && !placed.has(targetIndex)) {
      nextHandlers.push(handler);
      placed.add(targetIndex);
    }
    return { ...group, hooks: nextHandlers };
  });

  targets.forEach((target, index) => {
    if (placed.has(index)) return;
    const group: Record<string, unknown> = { hooks: [handler] };
    if (target.matcher !== undefined) group.matcher = target.matcher;
    nextGroups.push(group);
  });
  return nextGroups;
}

function matcherMatches(value: unknown, expected: string | undefined): boolean {
  return expected === undefined ? value === undefined : value === expected;
}

function parseSettingsRoot(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (!isObject(value)) {
    throw new Error("Claude Settings Must Be A JSON Object");
  }
  return value;
}

function parseHooksRoot(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (!isObject(value)) throw new Error("Claude Hooks Must Be A JSON Object");
  return value;
}

function parseHookGroups(value: unknown, event: string): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`Claude ${event} Hooks Must Be An Array`);
  }
  return value;
}

function isClaudeCastHookHandler(value: unknown): boolean {
  return (
    isObject(value) &&
    value.type === "command" &&
    typeof value.command === "string" &&
    value.command.includes(CLAUDECAST_HOOK_MARKER)
  );
}

function requiredRequestId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("Inbox Request ID Is Invalid");
  }
  return value;
}

function requiredHex(value: unknown, label: string, length: number): string {
  if (
    typeof value !== "string" ||
    value.length !== length ||
    !/^[0-9a-f]+$/i.test(value)
  ) {
    throw new Error(`${label} Is Invalid`);
  }
  return value;
}

function requiredDate(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} Is Invalid`);
  }
  return value;
}

function requiredIdentifier(value: unknown, label: string): string {
  const identifier = requiredString(value, label, MAX_ID_LENGTH);
  if (/\p{Cc}/u.test(identifier)) throw new Error(`${label} Is Invalid`);
  return identifier;
}

function requiredToolName(value: unknown): string {
  const toolName = requiredString(value, "Tool Name", MAX_TOOL_NAME_LENGTH);
  if (!/^[A-Za-z0-9_.:-]+$/.test(toolName)) {
    throw new Error("Tool Name Is Invalid");
  }
  return toolName;
}

function optionalIdentifier(
  value: unknown,
  label: string,
  maxLength: number,
): string | undefined {
  const identifier = optionalString(value, maxLength);
  if (identifier !== undefined && /\p{Cc}/u.test(identifier)) {
    throw new Error(`${label} Is Invalid`);
  }
  return identifier;
}

function requiredString(
  value: unknown,
  label: string,
  maxLength: number,
  trim = true,
): string {
  if (typeof value !== "string") throw new Error(`${label} Must Be Text`);
  const normalized = trim ? value.trim() : value;
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`${label} Is Invalid`);
  }
  return normalized;
}

function optionalString(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error("Optional Field Must Be Text");
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new Error("Optional Field Is Too Long");
  }
  return normalized;
}

function isUnsafeObjectKey(value: string): boolean {
  return (
    value === "__proto__" || value === "prototype" || value === "constructor"
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
