import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import {
  buildPermissionAllowOutput,
  buildPermissionDenyOutput,
  buildPlanAllowOutput,
  buildPlanDeferOutput,
  hasClaudeCastHook,
  installClaudeCastHook,
  parseAgentNotificationHookInput,
  parseExitPlanModeHookInput,
  parsePermissionRequestHookInput,
  QUESTION_SCHEMA_VERSION,
  QUESTION_TIMEOUT_MS,
  uninstallClaudeCastHook,
  validateInboxRequest,
  validateInboxResponse,
  type ClaudePermissionRequest,
  type ClaudePlanRequest,
} from "../src/lib/ask-user-question-core.ts";

const require = createRequire(import.meta.url);
const runner =
  require("../assets/hooks/claudecast-ask-user-question-v1.cjs") as {
    atomicWriteJson: (filePath: string, value: unknown) => Promise<void>;
    buildRaycastLaunch: (
      requestId: string,
      platform?: NodeJS.Platform,
    ) => { executable: string; args: string[] };
    parseHookInput: (value: unknown) => Record<string, unknown>;
    runClaudeCastQuestionHook: (options: {
      raw: unknown;
      rootDirectory: string;
      timeoutMs?: number;
      pollMs?: number;
      openRaycast?: (requestId: string) => Promise<void>;
    }) => Promise<Record<string, unknown>>;
    validateResponse: (
      value: unknown,
      request: Record<string, unknown>,
      now?: number,
    ) => Record<string, unknown>;
  };

function commonInput(): Record<string, unknown> {
  return {
    session_id: "session-1",
    cwd: "/work/project",
    transcript_path: "/data/session-1.jsonl",
  };
}

function questionInput(): Record<string, unknown> {
  return {
    ...commonInput(),
    hook_event_name: "PreToolUse",
    tool_name: "AskUserQuestion",
    tool_use_id: "tool-question",
    tool_input: {
      questions: [
        {
          question: "Which branch?",
          header: "Branch",
          options: [{ label: "Main" }, { label: "Release" }],
          multiSelect: false,
        },
      ],
      futureField: "keep",
    },
  };
}

function permissionInput(
  toolInput: Record<string, unknown> = {
    command: "npm test",
    description: "Run the test suite",
  },
): Record<string, unknown> {
  return {
    ...commonInput(),
    hook_event_name: "PermissionRequest",
    permission_mode: "default",
    tool_name: "Bash",
    tool_input: toolInput,
    permission_suggestions: [
      {
        type: "addRules",
        rules: [{ toolName: "Bash", ruleContent: "npm test" }],
        behavior: "allow",
        destination: "localSettings",
      },
    ],
  };
}

function planInput(): Record<string, unknown> {
  return {
    ...commonInput(),
    hook_event_name: "PreToolUse",
    tool_name: "ExitPlanMode",
    tool_use_id: "tool-plan",
    tool_input: {
      plan: "## Plan\n\n1. Run tests",
      planFilePath: "/data/plans/run-tests.md",
      allowedPrompts: [{ tool: "Bash", prompt: "run tests" }],
      futureField: "keep",
    },
  };
}

function notificationInput(
  notificationType: "agent_needs_input" | "agent_completed",
): Record<string, unknown> {
  return {
    ...commonInput(),
    hook_event_name: "Notification",
    notification_type: notificationType,
    title:
      notificationType === "agent_needs_input"
        ? "Agent Needs Input"
        : "Agent Completed",
    message:
      notificationType === "agent_needs_input"
        ? "The review agent needs a decision"
        : "The review agent completed",
  };
}

function requestBase(
  eventType: "permission" | "plan",
): Record<string, unknown> {
  const now = Date.now();
  return {
    version: QUESTION_SCHEMA_VERSION,
    requestId: "123e4567-e89b-42d3-a456-426614174000",
    nonce: "a".repeat(64),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUESTION_TIMEOUT_MS).toISOString(),
    eventType,
    sessionId: "session-1",
    cwd: "/work/project",
    transcriptPath: "/data/session-1.jsonl",
  };
}

test("parses official permission, plan, and agent notification inputs", () => {
  const permission = parsePermissionRequestHookInput(permissionInput());
  assert.equal(permission.eventType, "permission");
  assert.equal(permission.toolName, "Bash");
  assert.equal(permission.toolSummary, "Run the test suite");
  assert.match(permission.toolInputPreview, /npm test/);

  const plan = parseExitPlanModeHookInput(planInput());
  assert.equal(plan.eventType, "plan");
  assert.equal(plan.planFilePath, "/data/plans/run-tests.md");
  assert.equal(plan.originalToolInput.futureField, "keep");

  const waiting = parseAgentNotificationHookInput(
    notificationInput("agent_needs_input"),
  );
  const completed = parseAgentNotificationHookInput(
    notificationInput("agent_completed"),
  );
  assert.equal(waiting.eventType, "agent_waiting");
  assert.equal(completed.eventType, "agent_completed");
});

test("builds only decisions allowed by each official reply contract", () => {
  assert.deepEqual(buildPermissionAllowOutput(), {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: "allow" },
    },
  });
  assert.deepEqual(buildPermissionDenyOutput("Tests are failing"), {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: "deny", message: "Tests are failing" },
    },
  });

  const originalToolInput = (planInput().tool_input ?? {}) as Record<
    string,
    unknown
  >;
  const planOutput = buildPlanAllowOutput(originalToolInput);
  assert.deepEqual(
    (planOutput.hookSpecificOutput as Record<string, unknown>).updatedInput,
    originalToolInput,
  );
  assert.equal(
    (buildPlanDeferOutput().hookSpecificOutput as Record<string, unknown>)
      .permissionDecision,
    "defer",
  );
});

test("validates event-specific response schemas", () => {
  const permission = validateInboxRequest({
    ...requestBase("permission"),
    toolName: "Bash",
    toolSummary: "Run tests",
    toolInputPreview: '{"command":"npm test"}',
  }) as ClaudePermissionRequest;
  const plan = validateInboxRequest({
    ...requestBase("plan"),
    toolUseId: "tool-plan",
    plan: "Run the tests",
    planFilePath: "/data/plan.md",
  }) as ClaudePlanRequest;
  const responseBase = {
    version: QUESTION_SCHEMA_VERSION,
    requestId: permission.requestId,
    nonce: permission.nonce,
    answeredAt: new Date().toISOString(),
  };

  assert.equal(
    validateInboxResponse({ ...responseBase, status: "allowed" }, permission)
      .status,
    "allowed",
  );
  assert.throws(
    () =>
      validateInboxResponse({ ...responseBase, status: "denied" }, permission),
    /Denial Reason/,
  );
  assert.throws(
    () =>
      validateInboxResponse(
        { ...responseBase, status: "deferred" },
        permission,
      ),
    /Permission Response Status/,
  );
  assert.equal(
    validateInboxResponse(
      {
        ...responseBase,
        requestId: plan.requestId,
        nonce: plan.nonce,
        status: "deferred",
      },
      plan,
    ).status,
    "deferred",
  );
});

test("merges, repairs, and removes every ClaudeCast hook without touching user hooks", () => {
  const command = "node '/support/claudecast-ask-user-question-v1.cjs'";
  const settings = {
    theme: "dark",
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: "user-stop" }] }],
      PreToolUse: [
        {
          matcher: "AskUserQuestion",
          hooks: [
            { type: "command", command: "user-question" },
            { type: "command", command },
            { type: "command", command },
          ],
        },
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "user-bash" }],
        },
      ],
      PermissionRequest: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "user-permission" }],
        },
      ],
      Notification: [
        {
          matcher: "idle_prompt",
          hooks: [{ type: "command", command: "user-notification" }],
        },
      ],
    },
  };

  const installed = installClaudeCastHook(settings, command);
  const reinstalled = installClaudeCastHook(installed.settings, command);
  const serialized = JSON.stringify(reinstalled.settings);
  assert.equal(installed.changed, true);
  assert.equal(reinstalled.changed, false);
  assert.equal(hasClaudeCastHook(reinstalled.settings, command), true);
  assert.equal(serialized.match(/claudecast-ask-user-question-v1/g)?.length, 4);
  assert.match(serialized, /user-stop/);
  assert.match(serialized, /user-question/);
  assert.match(serialized, /user-bash/);
  assert.match(serialized, /user-permission/);
  assert.match(serialized, /user-notification/);

  const removed = uninstallClaudeCastHook(reinstalled.settings);
  const removedJson = JSON.stringify(removed.settings);
  assert.equal(hasClaudeCastHook(removed.settings), false);
  assert.doesNotMatch(removedJson, /claudecast-ask-user-question-v1/);
  assert.match(removedJson, /user-stop/);
  assert.match(removedJson, /user-permission/);
});

test("routes concurrent mixed requests through distinct private queue files", async (t) => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-permission-inbox-"),
  );
  t.after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });

  const inputs = [questionInput(), permissionInput(), planInput()];
  const openedIds = new Set<string>();
  const openRaycast = async (requestId: string) => {
    assert.equal(openedIds.has(requestId), false);
    openedIds.add(requestId);
    const requestsDirectory = path.join(root, "requests");
    const requestPath = path.join(requestsDirectory, `${requestId}.json`);
    const request = JSON.parse(
      await fs.promises.readFile(requestPath, "utf8"),
    ) as Record<string, unknown>;
    const temporaryEntries = (
      await fs.promises.readdir(requestsDirectory)
    ).filter(
      (entry) =>
        entry.startsWith(`${requestId}.json.`) && entry.endsWith(".tmp"),
    );
    assert.deepEqual(temporaryEntries, []);
    if (process.platform !== "win32") {
      assert.equal((await fs.promises.stat(requestPath)).mode & 0o777, 0o600);
    }

    const status =
      request.eventType === "question"
        ? "answered"
        : request.eventType === "plan"
          ? "deferred"
          : "allowed";
    const response: Record<string, unknown> = {
      version: request.version,
      requestId,
      nonce: request.nonce,
      status,
      answeredAt: new Date().toISOString(),
    };
    if (request.eventType === "question") {
      response.answers = { "Which branch?": "Main" };
    }
    await runner.atomicWriteJson(
      path.join(root, "responses", `${requestId}.json`),
      response,
    );
  };

  const outputs = await Promise.all(
    inputs.map((raw) =>
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
  assert.equal(
    (outputs[0].hookSpecificOutput as Record<string, unknown>)
      .permissionDecision,
    "allow",
  );
  assert.deepEqual(
    (outputs[1].hookSpecificOutput as Record<string, unknown>).decision,
    { behavior: "allow" },
  );
  assert.equal(
    (outputs[2].hookSpecificOutput as Record<string, unknown>)
      .permissionDecision,
    "defer",
  );
  assert.deepEqual(await fs.promises.readdir(path.join(root, "requests")), []);
  assert.deepEqual(await fs.promises.readdir(path.join(root, "responses")), []);
});

test("publishes one complete response when concurrent writers race", async (t) => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-response-race-"),
  );
  t.after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });
  const responsePath = path.join(root, "response.json");
  const results = await Promise.allSettled([
    runner.atomicWriteJson(responsePath, { writer: "first", complete: true }),
    runner.atomicWriteJson(responsePath, { writer: "second", complete: true }),
  ]);
  const response = JSON.parse(await fs.promises.readFile(responsePath, "utf8"));

  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.filter((result) => result.status === "rejected").length,
    1,
  );
  assert.equal(response.complete, true);
  assert.match(response.writer, /^(first|second)$/);
  assert.deepEqual(
    (await fs.promises.readdir(root)).filter((entry) => entry.endsWith(".tmp")),
    [],
  );
});

test("returns permission and plan replies with the documented output shapes", async (t) => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-permission-replies-"),
  );
  t.after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });

  async function respondWith(status: string, reason?: string) {
    return async (requestId: string) => {
      const request = JSON.parse(
        await fs.promises.readFile(
          path.join(root, "requests", `${requestId}.json`),
          "utf8",
        ),
      ) as Record<string, unknown>;
      await runner.atomicWriteJson(
        path.join(root, "responses", `${requestId}.json`),
        {
          version: request.version,
          requestId,
          nonce: request.nonce,
          status,
          answeredAt: new Date().toISOString(),
          ...(reason ? { reason } : {}),
        },
      );
    };
  }

  const permissionDenied = await runner.runClaudeCastQuestionHook({
    raw: permissionInput(),
    rootDirectory: root,
    timeoutMs: 1_000,
    pollMs: 5,
    openRaycast: await respondWith("denied", "Tests are failing"),
  });
  assert.deepEqual(
    (permissionDenied.hookSpecificOutput as Record<string, unknown>).decision,
    {
      behavior: "deny",
      message: "Tests are failing",
    },
  );

  const planAllowed = await runner.runClaudeCastQuestionHook({
    raw: planInput(),
    rootDirectory: root,
    timeoutMs: 1_000,
    pollMs: 5,
    openRaycast: await respondWith("allowed"),
  });
  const planOutput = planAllowed.hookSpecificOutput as Record<string, unknown>;
  assert.equal(planOutput.permissionDecision, "allow");
  assert.deepEqual(planOutput.updatedInput, planInput().tool_input);
});

test("queues agent waiting state and clears it on completion without opening Raycast", async (t) => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-agent-waiting-"),
  );
  t.after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });
  let launches = 0;
  const waitingOutput = await runner.runClaudeCastQuestionHook({
    raw: notificationInput("agent_needs_input"),
    rootDirectory: root,
    openRaycast: async () => {
      launches += 1;
    },
  });
  assert.deepEqual(waitingOutput, {});
  assert.equal(launches, 1);
  assert.equal(
    (await fs.promises.readdir(path.join(root, "requests"))).length,
    1,
  );

  const completedOutput = await runner.runClaudeCastQuestionHook({
    raw: notificationInput("agent_completed"),
    rootDirectory: root,
    openRaycast: async () => {
      launches += 1;
    },
  });
  assert.deepEqual(completedOutput, {});
  assert.equal(launches, 1);
  assert.deepEqual(await fs.promises.readdir(path.join(root, "requests")), []);
});

test("rejects malformed event fields and mismatched or replayed responses", () => {
  assert.throws(
    () =>
      parsePermissionRequestHookInput(
        permissionInput({ command: "x".repeat(12_001) }),
      ),
    /Too Long|too long/i,
  );
  assert.throws(
    () =>
      parsePermissionRequestHookInput({
        ...permissionInput(),
        tool_name: "Bash\nInjected",
      }),
    /Tool Name Is Invalid/,
  );
  assert.throws(
    () =>
      parseExitPlanModeHookInput({
        ...planInput(),
        tool_input: { plan: "No path" },
      }),
    /Plan File Path/,
  );
  assert.throws(
    () =>
      parseAgentNotificationHookInput({
        ...notificationInput("agent_needs_input"),
        notification_type: "permission_prompt",
      }),
    /Agent Event/,
  );

  const request = {
    version: QUESTION_SCHEMA_VERSION,
    requestId: "123e4567-e89b-42d3-a456-426614174000",
    nonce: "a".repeat(64),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    eventType: "permission",
  };
  assert.throws(
    () =>
      runner.validateResponse(
        {
          version: QUESTION_SCHEMA_VERSION,
          requestId: request.requestId,
          nonce: "b".repeat(64),
          status: "allowed",
          answeredAt: new Date().toISOString(),
        },
        request,
      ),
    /identity does not match/,
  );
});

test("times out safely without leaking command or credential content", async (t) => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-permission-timeout-"),
  );
  t.after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });
  const secret = "token-secret-value-4189";
  const timedOut = await runner.runClaudeCastQuestionHook({
    raw: permissionInput({
      command: `deploy --token ${secret}`,
      apiKey: secret,
    }),
    rootDirectory: root,
    timeoutMs: 20,
    pollMs: 5,
    openRaycast: async () => undefined,
  });
  const oversized = await runner.runClaudeCastQuestionHook({
    raw: permissionInput({ command: secret.repeat(2_000) }),
    rootDirectory: root,
    timeoutMs: 20,
    pollMs: 5,
  });
  const serialized = JSON.stringify([timedOut, oversized]);

  assert.match(serialized, /timed out/i);
  assert.doesNotMatch(serialized, new RegExp(secret));
  assert.deepEqual(await fs.promises.readdir(path.join(root, "requests")), []);
  assert.deepEqual(await fs.promises.readdir(path.join(root, "responses")), []);
});

test("builds content-free macOS and Windows Raycast launches", () => {
  const requestId = "123e4567-e89b-42d3-a456-426614174000";
  const mac = runner.buildRaycastLaunch(requestId, "darwin");
  const windows = runner.buildRaycastLaunch(requestId, "win32");

  assert.equal(mac.executable, "/usr/bin/open");
  assert.equal(windows.executable, "rundll32.exe");
  assert.deepEqual(windows.args.slice(0, 1), ["url.dll,FileProtocolHandler"]);
  assert.match(mac.args[0], /claude-questions/);
  assert.match(windows.args[1], /claude-questions/);
  assert.match(decodeURIComponent(mac.args[0]), new RegExp(requestId));
  assert.doesNotMatch(JSON.stringify([mac, windows]), /session-1|npm test/);
});
