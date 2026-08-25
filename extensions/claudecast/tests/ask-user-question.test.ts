import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import {
  buildAskUserQuestionAllowOutput,
  buildHookCommand,
  hasClaudeCastHook,
  installClaudeCastHook,
  isSafeQuestionFileName,
  parseAskUserQuestionHookInput,
  QUESTION_SCHEMA_VERSION,
  QUESTION_TIMEOUT_MS,
  uninstallClaudeCastHook,
  validateQuestionRequest,
  validateQuestionResponse,
} from "../src/lib/ask-user-question-core.ts";

const require = createRequire(import.meta.url);
const runner =
  require("../assets/hooks/claudecast-ask-user-question-v1.cjs") as {
    atomicWriteJson: (filePath: string, value: unknown) => Promise<void>;
    runClaudeCastQuestionHook: (options: {
      raw: unknown;
      rootDirectory: string;
      timeoutMs?: number;
      pollMs?: number;
      openRaycast?: (requestId: string) => Promise<void>;
    }) => Promise<Record<string, unknown>>;
  };

function hookInput(
  questions: unknown[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    session_id: "session-1",
    tool_use_id: "tool-1",
    cwd: "/work/project",
    transcript_path: "/data/session-1.jsonl",
    hook_event_name: "PreToolUse",
    tool_name: "AskUserQuestion",
    tool_input: {
      questions,
      futureOfficialField: "preserve-me",
    },
    unknownTopLevelField: "ignore-me",
    ...extra,
  };
}

function choiceQuestion(question = "Which branch?") {
  return {
    question,
    header: "Branch",
    options: [
      { label: "Main", description: "Use the main branch" },
      { label: "Release", description: "Use the release branch" },
    ],
    multiSelect: false,
  };
}

function requestFixture() {
  const now = Date.now();
  return validateQuestionRequest(
    {
      version: QUESTION_SCHEMA_VERSION,
      requestId: "123e4567-e89b-42d3-a456-426614174000",
      nonce: "a".repeat(64),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + QUESTION_TIMEOUT_MS).toISOString(),
      sessionId: "session-1",
      questions: [choiceQuestion()],
      unknownField: "discard-me",
    },
    now,
  );
}

test("merges with unrelated Claude hooks", () => {
  const settings = {
    theme: "dark",
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: "existing-stop" }] }],
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "existing-bash" }],
        },
        {
          matcher: "AskUserQuestion",
          hooks: [{ type: "command", command: "existing-question" }],
        },
      ],
    },
  };
  const update = installClaudeCastHook(
    settings,
    "node '/support/claudecast-ask-user-question-v1.cjs'",
  );

  assert.equal(update.changed, true);
  assert.equal(update.settings.theme, "dark");
  assert.deepEqual(
    (update.settings.hooks as typeof settings.hooks).Stop,
    settings.hooks.Stop,
  );
  const serialized = JSON.stringify(update.settings);
  assert.match(serialized, /existing-bash/);
  assert.match(serialized, /existing-question/);
  assert.match(serialized, /claudecast-ask-user-question-v1/);
});

test("reinstalls without duplication and updates its own command", () => {
  const first = installClaudeCastHook(
    {},
    "node '/old/claudecast-ask-user-question-v1.cjs'",
  );
  const second = installClaudeCastHook(
    first.settings,
    "node '/new/claudecast-ask-user-question-v1.cjs'",
  );
  const third = installClaudeCastHook(
    second.settings,
    "node '/new/claudecast-ask-user-question-v1.cjs'",
  );
  const serialized = JSON.stringify(third.settings);

  assert.equal(second.changed, true);
  assert.equal(third.changed, false);
  assert.equal(serialized.match(/claudecast-ask-user-question-v1/g)?.length, 4);
  assert.doesNotMatch(serialized, /\/old\//);
});

test("uninstalls only the ClaudeCast hook", () => {
  const installed = installClaudeCastHook(
    {
      hooks: {
        PreToolUse: [
          {
            matcher: "AskUserQuestion",
            hooks: [{ type: "command", command: "user-command" }],
          },
        ],
      },
    },
    "node '/support/claudecast-ask-user-question-v1.cjs'",
  );
  const removed = uninstallClaudeCastHook(installed.settings);
  const serialized = JSON.stringify(removed.settings);

  assert.equal(removed.changed, true);
  assert.equal(hasClaudeCastHook(removed.settings), false);
  assert.match(serialized, /user-command/);
});

test("parses single-choice, multi-select, and freeform questions", () => {
  const parsed = parseAskUserQuestionHookInput(
    hookInput([
      choiceQuestion(),
      {
        question: "Which checks?",
        header: "Checks",
        options: [{ label: "Tests" }, { label: "Lint" }],
        multiSelect: true,
      },
      {
        question: "Anything else?",
        header: "Notes",
        options: [],
        multiSelect: false,
      },
    ]),
  );

  assert.equal(parsed.questions.length, 3);
  assert.equal(parsed.questions[1].multiSelect, true);
  assert.deepEqual(parsed.questions[2].options, []);
  assert.equal(parsed.originalToolInput.futureOfficialField, "preserve-me");
  assert.equal("unknownTopLevelField" in parsed, false);
});

test("builds the documented updatedInput reply contract", () => {
  const parsed = parseAskUserQuestionHookInput(hookInput([choiceQuestion()]));
  const output = buildAskUserQuestionAllowOutput(parsed.originalToolInput, {
    "Which branch?": "Main",
  });
  const hookOutput = output.hookSpecificOutput as Record<string, unknown>;
  const updatedInput = hookOutput.updatedInput as Record<string, unknown>;

  assert.equal(hookOutput.hookEventName, "PreToolUse");
  assert.equal(hookOutput.permissionDecision, "allow");
  assert.deepEqual(updatedInput.questions, parsed.originalToolInput.questions);
  assert.deepEqual(updatedInput.answers, { "Which branch?": "Main" });
  assert.equal(updatedInput.futureOfficialField, "preserve-me");
});

test("rejects malformed question and response fields", () => {
  assert.throws(
    () => parseAskUserQuestionHookInput(hookInput([])),
    /One to Four Questions/,
  );
  assert.throws(
    () =>
      parseAskUserQuestionHookInput(
        hookInput([choiceQuestion("Same"), choiceQuestion("Same")]),
      ),
    /Unique/,
  );
  const request = requestFixture();
  assert.throws(
    () =>
      validateQuestionResponse(
        {
          version: QUESTION_SCHEMA_VERSION,
          requestId: request.requestId,
          nonce: request.nonce,
          status: "answered",
          answeredAt: new Date().toISOString(),
          answers: { "Unknown question": "Main" },
        },
        request,
      ),
    /Unknown Question/,
  );
  assert.equal("unknownField" in request, false);
});

test("builds macOS and Windows hook commands without path interpolation", () => {
  assert.equal(
    buildHookCommand(
      "/Users/me/Claude Cast/claudecast-ask-user-question-v1.cjs",
      "darwin",
    ),
    "node '/Users/me/Claude Cast/claudecast-ask-user-question-v1.cjs'",
  );
  assert.equal(
    buildHookCommand(
      "C:\\Users\\Me 100%\\ClaudeCast\\claudecast-ask-user-question-v1.cjs",
      "win32",
    ),
    'node "C:\\Users\\Me 100%%\\ClaudeCast\\claudecast-ask-user-question-v1.cjs"',
  );
  assert.equal(
    isSafeQuestionFileName("123e4567-e89b-42d3-a456-426614174000.json"),
    true,
  );
  assert.equal(isSafeQuestionFileName("../response.json"), false);
});

test("routes concurrent questions through atomic request and response files", async (t) => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-question-runner-"),
  );
  t.after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });

  const rawInputs = ["Branch?", "Checks?", "Notes?"].map((question) =>
    hookInput([
      question === "Notes?"
        ? { question, options: [], multiSelect: false }
        : {
            question,
            options: [{ label: "One" }, { label: "Two" }],
            multiSelect: question === "Checks?",
          },
    ]),
  );
  const openedIds = new Set<string>();
  const openRaycast = async (requestId: string) => {
    assert.equal(openedIds.has(requestId), false);
    openedIds.add(requestId);
    const requestPath = path.join(root, "requests", `${requestId}.json`);
    const request = JSON.parse(
      await fs.promises.readFile(requestPath, "utf8"),
    ) as {
      version: number;
      nonce: string;
      questions: Array<{ question: string }>;
    };
    const question = request.questions[0].question;
    const answer =
      question === "Checks?"
        ? "One, Two"
        : question === "Notes?"
          ? "Freeform answer"
          : "One";
    await runner.atomicWriteJson(
      path.join(root, "responses", `${requestId}.json`),
      {
        version: request.version,
        requestId,
        nonce: request.nonce,
        status: "answered",
        answeredAt: new Date().toISOString(),
        answers: { [question]: answer },
      },
    );
  };

  const outputs = await Promise.all(
    rawInputs.map((raw) =>
      runner.runClaudeCastQuestionHook({
        raw,
        rootDirectory: root,
        timeoutMs: 1_000,
        pollMs: 5,
        openRaycast,
      }),
    ),
  );

  assert.equal(openedIds.size, 3);
  assert.deepEqual(
    outputs.map(
      (output) =>
        (output.hookSpecificOutput as Record<string, unknown>)
          .permissionDecision,
    ),
    ["allow", "allow", "allow"],
  );
  assert.deepEqual(await fs.promises.readdir(path.join(root, "requests")), []);
  assert.deepEqual(await fs.promises.readdir(path.join(root, "responses")), []);
  assert.deepEqual(
    (outputs[1].hookSpecificOutput as Record<string, unknown>)["updatedInput"],
    {
      questions: (rawInputs[1].tool_input as Record<string, unknown>).questions,
      futureOfficialField: "preserve-me",
      answers: { "Checks?": "One, Two" },
    },
  );
});

test("denies safely on timeout, Raycast failure, and malformed input", async (t) => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-question-failures-"),
  );
  t.after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });

  const timedOut = await runner.runClaudeCastQuestionHook({
    raw: hookInput([choiceQuestion()]),
    rootDirectory: root,
    timeoutMs: 20,
    pollMs: 5,
    openRaycast: async () => undefined,
  });
  const unavailable = await runner.runClaudeCastQuestionHook({
    raw: hookInput([choiceQuestion()]),
    rootDirectory: root,
    timeoutMs: 20,
    pollMs: 5,
    openRaycast: async () => {
      throw new Error("missing Raycast");
    },
  });
  const malformed = await runner.runClaudeCastQuestionHook({
    raw: { hook_event_name: "PreToolUse" },
    rootDirectory: root,
    timeoutMs: 20,
    pollMs: 5,
  });

  for (const output of [timedOut, unavailable, malformed]) {
    assert.equal(
      (output.hookSpecificOutput as Record<string, unknown>).permissionDecision,
      "deny",
    );
  }
  assert.match(JSON.stringify(timedOut), /timed out/i);
  assert.match(JSON.stringify(unavailable), /could not open Raycast/i);
  assert.match(JSON.stringify(malformed), /invalid AskUserQuestion/i);
});
