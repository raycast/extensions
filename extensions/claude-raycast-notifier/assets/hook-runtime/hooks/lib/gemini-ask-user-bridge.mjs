import { defaultRootDir, ensureUserData } from "./sound-config.mjs";
import { triggerRaycastCommand } from "./raycast-deeplink.mjs";
import {
  clearQuestionRequest,
  listQuestionRequests,
  writeQuestionRequest,
} from "./ask-user-question-request.mjs";
import {
  buildRequestId,
  clearQuestionResponse,
  waitForQuestionResponse,
} from "./ask-user-question-response.mjs";
import { normalizeQuestions } from "./claude-ask-user-question-bridge.mjs";

export async function runGeminiAskUserBridge({
  raw = {},
  rootDir = defaultRootDir(),
  timeoutMs = Number(
    process.env.GEMINI_NOTIFIER_QUESTION_TIMEOUT_MS ??
      process.env.CLAUDE_NOTIFIER_QUESTION_TIMEOUT_MS ??
      "300000",
  ),
  pollMs = Number(
    process.env.GEMINI_NOTIFIER_QUESTION_POLL_MS ??
      process.env.CLAUDE_NOTIFIER_QUESTION_POLL_MS ??
      "500",
  ),
  openRaycast = triggerRaycastCommand,
} = {}) {
  if (raw.tool_name !== "ask_user") {
    return null;
  }

  const toolInput = isObject(raw.tool_input) ? raw.tool_input : {};
  const normalizedQuestions = normalizeGeminiQuestions(toolInput);
  if (normalizedQuestions.length === 0) {
    return null;
  }

  const { paths } = await ensureUserData({ rootDir });
  const requestId = buildRequestId(
    raw.session_id ?? raw.sessionId ?? "gemini-session",
    raw.tool_use_id ?? raw.toolUseId ?? "ask-user",
  );

  await clearQuestionResponse(paths.rootDir, requestId);

  const payload = {
    requestId,
    sessionId: stringOrNull(raw.session_id ?? raw.sessionId),
    toolUseId: stringOrNull(raw.tool_use_id ?? raw.toolUseId),
    cwd: stringOrNull(raw.cwd),
    transcriptPath: null,
    source: "gemini",
    returnUrl: stringOrNull(
      raw.returnUrl ??
        raw.return_url ??
        process.env.AI_NOTIFIER_RETURN_URL ??
        process.env.GEMINI_NOTIFIER_RETURN_URL,
    ),
    title: toolInput.prompt ?? toolInput.title ?? "Gemini ask_user",
    questions: normalizedQuestions,
  };

  await writeQuestionRequest(paths.rootDir, {
    ...payload,
    createdAt: new Date().toISOString(),
  });

  try {
    const pendingRequests = await listQuestionRequests(paths.rootDir);
    const targetCommand =
      pendingRequests.length > 1
        ? "pending-claude-questions"
        : "answer-claude-question";
    await openRaycast(payload, targetCommand);
  } catch {
    await clearQuestionRequest(paths.rootDir, requestId);
    return null;
  }

  const response = await waitForQuestionResponse(paths.rootDir, requestId, {
    timeoutMs,
    pollMs,
  });

  await clearQuestionResponse(paths.rootDir, requestId);
  await clearQuestionRequest(paths.rootDir, requestId);

  if (!response) {
    return deny("Timed out waiting for Raycast input");
  }

  if (response.status === "cancelled") {
    return deny("User cancelled the Raycast prompt");
  }

  if (response.status !== "submitted" || !isObject(response.answers)) {
    return deny("Raycast returned an invalid ask_user response");
  }

  const answerText = buildGeminiAnswerText(
    normalizedQuestions,
    response.answers,
  );

  return {
    decision: "deny",
    reason: [
      "Raycast collected the user's answer for ask_user.",
      "Treat the following JSON as the completed ask_user result and continue without retrying the tool.",
      "",
      answerText,
    ].join("\n"),
  };
}

function normalizeGeminiQuestions(toolInput) {
  if (Array.isArray(toolInput.questions)) {
    return normalizeQuestions(toolInput.questions);
  }

  const question = normalizeGeminiQuestion(toolInput);
  return question ? [question] : [];
}

function normalizeGeminiQuestion(toolInput) {
  if (!isObject(toolInput)) return null;

  const prompt =
    stringOrNull(toolInput.prompt) ??
    stringOrNull(toolInput.question) ??
    stringOrNull(toolInput.title);
  if (!prompt) return null;

  const type = normalizeGeminiType(toolInput.type, toolInput.options);
  const options = normalizeGeminiOptions(type, toolInput.options);

  return {
    prompt,
    header: stringOrNull(toolInput.title),
    type,
    multiSelect: Boolean(toolInput.multiSelect ?? toolInput.multiple ?? false),
    choices: options,
    placeholder: stringOrNull(
      toolInput.placeholder ?? toolInput.input_placeholder,
    ),
  };
}

function normalizeGeminiType(type, options) {
  const normalized =
    typeof type === "string" ? type.trim().toLowerCase() : null;

  if (normalized === "text" || normalized === "yesno") {
    return normalized;
  }

  return Array.isArray(options) && options.length > 0 ? "choice" : "text";
}

function normalizeGeminiOptions(type, options) {
  if (type === "yesno") {
    return [{ label: "yes" }, { label: "no" }];
  }

  if (!Array.isArray(options)) return [];

  return options
    .map((option) => {
      if (typeof option === "string") {
        return { label: option };
      }

      if (!isObject(option)) return null;

      const label =
        stringOrNull(option.label) ??
        stringOrNull(option.title) ??
        stringOrNull(option.value);
      if (!label) return null;

      return {
        label,
        detail: stringOrNull(option.description) ?? stringOrNull(option.detail),
      };
    })
    .filter(Boolean);
}

function buildGeminiAnswerText(questions, answers) {
  const indexedAnswers = Object.fromEntries(
    questions.map((question, index) => [
      String(index),
      answers[question.prompt] ?? (question.multiSelect ? [] : ""),
    ]),
  );

  return JSON.stringify({ answers: indexedAnswers }, null, 2);
}

function deny(reason) {
  return {
    decision: "deny",
    reason,
  };
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function stringOrNull(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
