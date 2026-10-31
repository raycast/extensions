require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildCliArgs,
  parseCliEvent,
  parseCliModels,
  parseWorkbuddyModelMetadata,
} = require("../src/cli-protocols.ts");

for (const provider of ["qoder", "qoder-cn", "workbuddy"]) {
  test(`${provider} keeps option-like prompts literal and only resumes an explicit ID`, () => {
    const prompt = '--help $(write-file) & "literal"\nnext line';
    const args = buildCliArgs(provider, {
      prompt,
      model: "test-model",
      remoteId: "saved-session-123",
    });
    assert.deepEqual(args.slice(-3), ["--print", "--", prompt]);
    assert.equal(args[args.indexOf("--resume") + 1], "saved-session-123");
    assert.equal(args.includes("--continue"), false);
    assert.equal(args[args.indexOf("--tools") + 1], "");
    assert.equal(args.includes("--dangerously-skip-permissions"), false);
    assert.equal(args.includes("--strict-mcp-config"), true);
    assert.equal(
      JSON.parse(args[args.indexOf("--settings") + 1]).disableAllHooks,
      true,
    );
    assert.equal(
      buildCliArgs(provider, { prompt, model: "__cli_default__" }).includes(
        "--model",
      ),
      false,
    );
    assert.throws(
      () => buildCliArgs(provider, { prompt, model: "", remoteId: "--latest" }),
      /session ID/,
    );
    assert.throws(
      () => buildCliArgs(provider, { prompt, model: "", remoteId: "" }),
      /session ID/,
    );
  });

  test(`${provider} parses real envelope shapes without emitting reasoning or tool contents`, () => {
    assert.deepEqual(
      parseCliEvent(provider, {
        type: "system",
        subtype: "init",
        session_id: "s1",
      }),
      { sessionId: "s1" },
    );
    assert.deepEqual(
      parseCliEvent(provider, {
        type: "stream_event",
        session_id: "s1",
        event: {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Hello" },
        },
      }),
      { sessionId: "s1", delta: "Hello" },
    );
    assert.deepEqual(
      parseCliEvent(provider, {
        type: "stream_event",
        event: {
          type: "content_block_delta",
          delta: { type: "thinking_delta", thinking: "private" },
        },
      }),
      {},
    );
    assert.deepEqual(
      parseCliEvent(provider, {
        type: "assistant",
        session_id: "s1",
        message: {
          id: "message-1",
          content: [
            { type: "thinking", thinking: "private" },
            { type: "text", text: "Hello" },
          ],
        },
      }),
      { sessionId: "s1", itemId: "message-1", text: "Hello" },
    );
    assert.deepEqual(
      parseCliEvent(provider, {
        type: "assistant",
        session_id: "foreign",
        parent_tool_use_id: "parent",
        message: { content: [{ type: "text", text: "nested" }] },
      }),
      {},
    );
  });

  test(`${provider} distinguishes process exit zero from actual success or permission denial`, () => {
    const result = {
      type: "result",
      subtype: "success",
      is_error: false,
      session_id: "s1",
      result: "OK",
      permission_denials: [],
    };
    assert.deepEqual(parseCliEvent(provider, result), {
      sessionId: "s1",
      result: "completed",
      text: "OK",
    });
    const auth = parseCliEvent(provider, {
      ...result,
      subtype: "error_during_execution",
      is_error: true,
      errors: ["Authentication required. /login"],
    });
    assert.equal(auth.result, "failed");
    assert.equal(auth.text, undefined);
    assert.equal(
      parseCliEvent(provider, {
        ...result,
        permission_denials: [{ tool_name: "Bash" }],
      }).result,
      "failed",
    );
    assert.equal(
      parseCliEvent(provider, { ...result, is_error: undefined }).result,
      "failed",
    );
    assert.equal(
      parseCliEvent(provider, { type: "control_request" }).result,
      "failed",
    );
    for (const value of [
      null,
      [],
      "text",
      { type: "assistant", message: null },
    ])
      assert.deepEqual(parseCliEvent(provider, value), {});
  });
}

test("Qoder catalogs consume identifiers only after MODEL header, with deduplication", () => {
  assert.deepEqual(
    parseCliModels(
      "qoder-cn",
      "Fetching models...\nMODEL\nAuto\nFast\nQwen3.8-Max\nFast\n",
    ).map((m) => m.model),
    ["Auto", "Fast", "Qwen3.8-Max"],
  );
  assert.deepEqual(parseCliModels("qoder", "Authentication required"), []);
});

test("WorkBuddy catalog uses advertised model IDs, or an explicit whitelist projection", () => {
  assert.deepEqual(
    parseCliModels(
      "workbuddy",
      "--model <model>  Currently supported: (fast-model, balanced-model, primary-model, deep-model)",
    ).map((m) => m.model),
    ["fast-model", "balanced-model", "primary-model", "deep-model"],
  );
  assert.deepEqual(
    parseCliModels(
      "workbuddy",
      JSON.stringify({
        models: [
          { id: "fast-model", name: "Fast", secret: "must not propagate" },
        ],
      }),
    ),
    [
      {
        model: "fast-model",
        displayName: "Fast",
        efforts: [],
        defaultEffort: "",
      },
    ],
  );
  assert.deepEqual(parseCliModels("workbuddy", "invalid"), []);
});

test("WorkBuddy carries an explicitly selected effort as literal argv and rejects unknown values", () => {
  const args = buildCliArgs("workbuddy", {
    model: "hy3",
    effort: "low",
    prompt: "--literal & text",
  });
  assert.equal(args[args.indexOf("--effort") + 1], "low");
  assert.equal(args[args.indexOf("--model") + 1], "hy3");
  assert.equal(args.at(-1), "--literal & text");
  assert.equal(
    buildCliArgs("workbuddy", { model: "hy3", prompt: "test" }).includes(
      "--effort",
    ),
    false,
  );
  for (const effort of ["ultracode", "none", "--help", "high & anything"])
    assert.throws(
      () => buildCliArgs("workbuddy", { model: "hy3", effort, prompt: "test" }),
      /Invalid WorkBuddy/,
    );
  for (const provider of ["qoder", "qoder-cn", "gemini"])
    assert.throws(
      () =>
        buildCliArgs(provider, {
          model: "test-model",
          effort: "high",
          prompt: "test",
        }),
      /verified per-model/,
    );
});

test("WorkBuddy model metadata accepts only explicit per-model choices and excludes media and private fields", () => {
  const models = parseWorkbuddyModelMetadata({
    models: [
      {
        id: "hy3",
        name: "Hy3",
        supportsReasoning: true,
        reasoning: {
          supportedEfforts: ["low", "high", "high", "invented", null],
          defaultEffort: "high",
        },
        apiKey: "must-not-propagate",
      },
      {
        id: "fast-model",
        name: "Fast",
        supportsReasoning: true,
        reasoning: { effort: "medium" },
      },
      {
        id: "future-model",
        supportsToolCall: true,
        reasoning: { supportedEfforts: ["low"], defaultEffort: "max" },
      },
      {
        id: "image-generator",
        tags: ["text-to-image"],
        reasoning: { supportedEfforts: ["high"] },
      },
      { id: null, supportsReasoning: true },
    ],
  });
  assert.deepEqual(models, [
    {
      model: "hy3",
      displayName: "Hy3",
      efforts: ["low", "high"],
      defaultEffort: "high",
    },
    {
      model: "fast-model",
      displayName: "Fast",
      efforts: [],
      defaultEffort: "",
    },
    {
      model: "future-model",
      displayName: "future-model",
      efforts: ["low"],
      defaultEffort: "",
    },
  ]);
  assert.equal(JSON.stringify(models).includes("must-not-propagate"), false);
  assert.deepEqual(
    parseWorkbuddyModelMetadata({ models: "changed schema" }),
    [],
  );
});

test("Gemini preserves option-like prompts in one --prompt= argument and resumes only exact UUIDs", () => {
  const prompt = '--help --resume latest $(echo literal) & "quoted"\nnext line';
  const sessionId = "11111111-2222-4333-8444-555555555555";
  const args = buildCliArgs("gemini", {
    prompt,
    model: "__cli_default__",
    remoteId: sessionId,
  });
  assert.equal(args.at(-1), `--prompt=${prompt}`);
  assert.equal(args.filter((arg) => arg.startsWith("--prompt=")).length, 1);
  assert.equal(args[args.indexOf("--resume") + 1], sessionId);
  assert.equal(args[args.indexOf("--approval-mode") + 1], "default");
  assert.equal(args[args.indexOf("--extensions") + 1], "none");
  assert.equal(args.includes("--model"), false);
  assert.equal(args.includes("--yolo"), false);
  for (const remoteId of ["latest", "0", "1", "12", "--latest", ""])
    assert.throws(
      () => buildCliArgs("gemini", { prompt, model: "", remoteId }),
      /session (UUID|ID)/,
    );
});

test("Gemini stream ignores user messages and warnings while distinguishing deltas from snapshots", () => {
  const parse = (value) => parseCliEvent("gemini", value);
  assert.deepEqual(
    parse({ type: "init", session_id: "11111111-2222-4333-8444-555555555555" }),
    { sessionId: "11111111-2222-4333-8444-555555555555" },
  );
  assert.deepEqual(
    parse({ type: "message", role: "user", content: "private prompt" }),
    {},
  );
  assert.deepEqual(
    parse({ type: "error", severity: "warning", message: "retrying" }),
    {},
  );
  assert.deepEqual(
    parse({
      type: "message",
      role: "assistant",
      content: "partial",
      delta: true,
    }),
    { delta: "partial" },
  );
  assert.deepEqual(
    parse({
      type: "message",
      role: "assistant",
      content: "full answer",
      delta: false,
    }),
    { text: "full answer" },
  );
  assert.deepEqual(
    parse({ type: "tool_result", output: "private tool output" }),
    {},
  );
  assert.deepEqual(parse({ type: "result", status: "success" }), {
    result: "completed",
  });
});

test("Gemini terminal errors cannot become successful responses", () => {
  for (const value of [
    {
      type: "result",
      status: "error",
      error: { message: "Authentication required" },
    },
    {
      type: "result",
      status: "success",
      error: { message: "contradictory error" },
    },
    { type: "result", status: "unknown" },
    { type: "error", severity: "error", message: "private diagnostics" },
  ]) {
    const result = parseCliEvent("gemini", value);
    assert.equal(result.result, "failed");
    assert.equal(result.text, undefined);
    assert.equal(result.error.includes("private diagnostics"), false);
  }
});
