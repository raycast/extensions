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

export async function runClaudeAskUserQuestionBridge({
  raw = {},
  rootDir = defaultRootDir(),
  timeoutMs = Number(
    process.env.CLAUDE_NOTIFIER_QUESTION_TIMEOUT_MS ?? "300000",
  ),
  pollMs = Number(process.env.CLAUDE_NOTIFIER_QUESTION_POLL_MS ?? "500"),
  openRaycast = triggerRaycastCommand,
} = {}) {
  if (raw.tool_name !== "AskUserQuestion") {
    return null;
  }

  const toolInput = isObject(raw.tool_input) ? raw.tool_input : {};
  const normalizedQuestions = normalizeQuestions(toolInput.questions);
  if (normalizedQuestions.length === 0) {
    return null;
  }

  const { paths } = await ensureUserData({ rootDir });
  const requestId = buildRequestId(raw.session_id, raw.tool_use_id);

  await clearQuestionResponse(paths.rootDir, requestId);

  const payload = {
    requestId,
    sessionId: stringOrNull(raw.session_id),
    toolUseId: stringOrNull(raw.tool_use_id),
    cwd: stringOrNull(raw.cwd),
    transcriptPath: stringOrNull(raw.transcript_path),
    source: "claude",
    returnUrl: stringOrNull(
      raw.returnUrl ??
        raw.return_url ??
        process.env.AI_NOTIFIER_RETURN_URL ??
        process.env.CLAUDE_NOTIFIER_RETURN_URL,
    ),
    title: toolInput.prompt ?? raw.tool_name,
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
    return deny("Raycast returned an invalid question response");
  }

  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      updatedInput: {
        ...toolInput,
        questions: toolInput.questions ?? [],
        answers: response.answers,
      },
    },
  };
}

export function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions
    .map((question) => normalizeQuestion(question))
    .filter(Boolean);
}

function normalizeQuestion(question) {
  if (!isObject(question)) return null;

  const prompt =
    stringOrNull(question.question) ??
    stringOrNull(question.prompt) ??
    stringOrNull(question.label);
  if (!prompt) return null;

  const choices = normalizeChoices(question.choices ?? question.options);
  const type = normalizeQuestionType(question.type, choices);

  return {
    prompt,
    header:
      stringOrNull(question.header) ??
      stringOrNull(question.title) ??
      stringOrNull(question.label),
    type,
    multiSelect: Boolean(question.multiSelect ?? question.multiple ?? false),
    choices,
    placeholder: stringOrNull(
      question.placeholder ?? question.input_placeholder,
    ),
  };
}

function normalizeChoices(choices) {
  if (!Array.isArray(choices)) return [];

  return choices
    .map((choice) => {
      if (typeof choice === "string") {
        return { label: choice };
      }

      if (!isObject(choice)) return null;

      const label =
        stringOrNull(choice.label) ??
        stringOrNull(choice.title) ??
        stringOrNull(choice.value);
      if (!label) return null;

      return {
        label,
        detail: stringOrNull(choice.description) ?? stringOrNull(choice.detail),
      };
    })
    .filter(Boolean);
}

function deny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function stringOrNull(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeQuestionType(type, choices) {
  const normalized =
    typeof type === "string" ? type.trim().toLowerCase() : null;

  if (normalized === "text" || normalized === "yesno") {
    return normalized;
  }

  return choices.length > 0 ? "choice" : "text";
}
