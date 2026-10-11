const assert = require("node:assert/strict");
const { Module } = require("node:module");
const path = require("node:path");
const { test } = require("node:test");
const { buildSync } = require("esbuild");

const root = path.resolve(__dirname, "..");

function loadSource(entry, preferences = {}, storage = new Map(), modules = {}) {
  const filename = path.join(root, entry);
  const { outputFiles } = buildSync({
    entryPoints: [filename],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    packages: "external",
  });
  const api = {
    Color: Object.fromEntries(["Blue", "Green", "Magenta", "Orange", "Purple", "Red", "Yellow"].map((name) => [name, name])),
    getPreferenceValues: () => preferences,
    Toast: { Style: { Success: "success", Failure: "failure" } },
    showToast: async () => {},
    LocalStorage: {
      getItem: async (name) => storage.get(name),
      setItem: async (name, value) => {
        storage.set(name, value);
      },
      removeItem: async (name) => {
        storage.delete(name);
      },
    },
  };
  const loaded = new Module(filename, module);
  loaded.paths = module.paths;
  loaded.require = (name) => modules[name] ?? (name === "@raycast/api" ? api : require(name));
  loaded._compile(outputFiles[0].text, filename);
  return loaded.exports;
}

function action(model = "gpt-6-luna") {
  return {
    id: "test-action",
    name: "Test",
    description: "Test action",
    color: "Blue",
    systemPrompt: "Reply briefly.",
    model,
    temperature: "0.7",
    maxTokens: "32",
    favorite: true,
  };
}

async function hydrate(store) {
  if (!store.persist.hasHydrated()) {
    await new Promise((resolve) => {
      const unsubscribe = store.persist.onFinishHydration(() => {
        unsubscribe();
        resolve();
      });
    });
  }
}

async function withFetch(fetch, run) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = previous;
  }
}

function eventStream(events) {
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), {
    headers: { "content-type": "text/event-stream" },
  });
}

function openAIResponseStream() {
  return eventStream([
    { type: "response.output_item.added", output_index: 0, item: { type: "message", id: "message-test" } },
    { type: "response.output_text.delta", item_id: "message-test", output_index: 0, delta: "Hello" },
    { type: "response.completed", response: { usage: { input_tokens: 11, output_tokens: 7, total_tokens: 18 } } },
  ]);
}

test("built-in actions initially use GPT-6 Luna", async () => {
  const { useActionsState } = loadSource("src/store/actions.ts");
  await hydrate(useActionsState);
  const actions = useActionsState.getState().actions;
  assert.ok(actions.length > 0);
  assert.ok(actions.every((item) => item.model === "gpt-6-luna"));
});

test("saved model choices and favorites are preserved while retired Gemini models migrate", async () => {
  const saved = [action("gpt-4o-mini"), { ...action("gemini-3-pro-preview"), id: "gemini-action" }];
  const storage = new Map([["actions", JSON.stringify({ state: { actions: saved }, version: 4 })]]);
  const { useActionsState } = loadSource("src/store/actions.ts", {}, storage);
  await hydrate(useActionsState);
  assert.deepEqual(useActionsState.getState().actions, [saved[0], { ...saved[1], model: "gemini-3.1-pro-preview" }]);
  useActionsState.getState().removeFromFavorites(saved[0].id);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(JSON.parse(storage.get("actions")).state.actions[0].favorite, false);
});

test("old OpenAI selections migrate and existing history survives the store upgrade", async () => {
  for (const version of [1, 2, 3]) {
    const storage = new Map([
      ["actions", JSON.stringify({ state: { actions: [action("gpt-4-turbo-preview"), action("gpt-3.5-turbo")] }, version })],
    ]);
    const { useActionsState } = loadSource("src/store/actions.ts", {}, storage);
    await hydrate(useActionsState);
    assert.ok(useActionsState.getState().actions.every((item) => item.model === "gpt-6-luna"));
  }
  const history = [
    {
      id: "history-test",
      action: action("gpt-4o-mini"),
      timestamp: 1,
      prompt: "Test",
      result: "Result",
      tokens: { input: 11, output: 7, total: 18 },
    },
  ];
  const storage = new Map([["history", JSON.stringify({ state: { history }, version: 4 })]]);
  const { useHistoryState } = loadSource("src/store/history.ts", {}, storage);
  await hydrate(useHistoryState);
  assert.deepEqual(useHistoryState.getState().history, history);
});

test("model costs account for context thresholds and Gemini promotion dates", () => {
  const { calculateCost } = loadSource("src/lib/OpenAI.ts");
  const approximate = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);
  approximate(calculateCost("gpt-6-luna", 1000, 1000), 0.0006);
  approximate(calculateCost("gpt-6-luna", 300000, 1000), 0.06075);
  approximate(calculateCost("gpt-6.1-sol", 1000, 1000), 0.012);
  approximate(calculateCost("gpt-6-astra", 1000, 1000), 0.06);
  approximate(calculateCost("gpt-5.6-sol", 1000, 1000), 0.024);
  approximate(calculateCost("gpt-5.6-sol", 272000, 1000), 1.108);
  approximate(calculateCost("gpt-5.6-sol", 272001, 1000), 2.206008);
  approximate(calculateCost("gpt-5.6-terra", 1000, 1000), 0.014);
  approximate(calculateCost("gpt-5.6-terra", 272000, 1000), 0.556);
  approximate(calculateCost("gpt-5.6-terra", 272001, 1000), 1.106004);
  approximate(calculateCost("gpt-5.6-luna", 1000, 1000), 0.0014);
  approximate(calculateCost("gpt-5.6-luna", 272000, 1000), 0.0556);
  approximate(calculateCost("gpt-5.6-luna", 272001, 1000), 0.1106004);
  approximate(calculateCost("gemini-3.8-flash", 1000, 1000, Date.UTC(2026, 11, 31)), 0.0045);
  approximate(calculateCost("gemini-3.8-flash", 1000, 1000, Date.UTC(2027, 0, 1)), 0.009);
  approximate(calculateCost("gemini-3.1-pro-preview", 200000, 1000), 0.412);
  approximate(calculateCost("gemini-3.1-pro-preview", 200001, 1000), 0.818004);
});

test("only the selected provider requires an API key", () => {
  const { getModel } = loadSource("src/lib/OpenAI.ts");
  assert.throws(() => getModel("gpt-6-luna"), /OpenAI API Key is missing/);
  assert.throws(() => getModel("gemini-3.8-flash"), /Gemini API Key is missing/);
  const geminiOnly = loadSource("src/lib/OpenAI.ts", { geminiApiKey: "test-gemini-key" });
  assert.doesNotThrow(() => geminiOnly.getModel("gemini-3.8-flash"));
  const openAIOnly = loadSource("src/lib/OpenAI.ts", { apikey: "test-openai-key" });
  assert.doesNotThrow(() => openAIOnly.getModel("gpt-6-luna"));
});

test("reasoning settings preserve provider defaults and fall back when a model cannot use the selected level", () => {
  const { getReasoningLevel } = loadSource("src/lib/OpenAI.ts");
  assert.equal(getReasoningLevel("gpt-6-luna"), "default");
  assert.equal(getReasoningLevel("gemini-3.8-flash"), "default");
  assert.equal(getReasoningLevel("gpt-6-luna", "max"), "max");
  assert.equal(getReasoningLevel("gpt-6-luna", "none"), "none");
  assert.equal(getReasoningLevel("gpt-6-astra", "none"), "default");
  assert.equal(getReasoningLevel("gpt-6.1-sol", "none"), "default");
  assert.equal(getReasoningLevel("gpt-5.4", "max"), "default");
  for (const model of ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]) {
    assert.equal(getReasoningLevel(model), "default");
    assert.equal(getReasoningLevel(model, "none"), "none");
    assert.equal(getReasoningLevel(model, "max"), "max");
    assert.equal(getReasoningLevel(model, "minimal"), "default");
  }
  assert.equal(getReasoningLevel("gpt-4o-mini", "high"), "default");
  assert.equal(getReasoningLevel("gemini-3.8-flash", "minimal"), "default");
  assert.equal(getReasoningLevel("gemini-3.6-flash", "minimal"), "minimal");
  assert.equal(getReasoningLevel("gemini-3.1-pro-preview", "medium"), "medium");
  assert.equal(getReasoningLevel("gemini-2.5-flash", "none"), "none");
});

test("temperature is used only when the selected reasoning mode supports it", () => {
  const { supportsTemperature } = loadSource("src/lib/OpenAI.ts");
  assert.equal(supportsTemperature("gpt-6-luna"), false);
  assert.equal(supportsTemperature("gpt-6-luna", "high"), false);
  assert.equal(supportsTemperature("gpt-6-luna", "none"), true);
  assert.equal(supportsTemperature("gpt-5.4", "none"), true);
  assert.equal(supportsTemperature("gpt-6-astra", "none"), false);
  assert.equal(supportsTemperature("gpt-4o-mini"), true);
  assert.equal(supportsTemperature("gemini-3.8-flash", "high"), true);
});

test("reasoning choices survive model migration and edits are saved for the next launch", async () => {
  const saved = { ...action("gemini-3-pro-preview"), reasoningLevel: "high" };
  const storage = new Map([["actions", JSON.stringify({ state: { actions: [saved] }, version: 4 })]]);
  const { useActionsState } = loadSource("src/store/actions.ts", {}, storage);
  await hydrate(useActionsState);
  const migrated = { ...saved, model: "gemini-3.1-pro-preview" };
  assert.deepEqual(useActionsState.getState().actions, [migrated]);
  useActionsState.getState().editAction({ ...migrated, reasoningLevel: "low" });
  await new Promise((resolve) => setImmediate(resolve));
  const reloaded = loadSource("src/store/actions.ts", {}, storage).useActionsState;
  await hydrate(reloaded);
  assert.deepEqual(reloaded.getState().actions, [{ ...migrated, reasoningLevel: "low" }]);
});

test("configured API keys are rejected before being sent as prompt text", async () => {
  const preferences = { apikey: "test-openai-key", geminiApiKey: "test-gemini-key" };
  const { generateActionResponse } = loadSource("src/lib/generateActionResponse.ts", preferences);
  await withFetch(
    async () => {
      assert.fail("A credential must not be sent in a prompt");
    },
    async () => {
      for (const key of Object.values(preferences)) {
        await assert.rejects(
          generateActionResponse(action(), key, new AbortController().signal, () => {}),
          /configured API key/,
        );
        await assert.rejects(
          generateActionResponse({ ...action(), systemPrompt: `Summarize ${key}` }, "Test", new AbortController().signal, () => {}),
          /configured API key/,
        );
      }
    },
  );
});

test("OpenAI requests apply supported thinking choices and stream the answer with token totals", async () => {
  const { generateActionResponse } = loadSource("src/lib/generateActionResponse.ts", { apikey: "test-openai-key" });
  for (const [model, level, expectedLevel, expectedTemperature] of [
    ["gpt-6-luna", "default", undefined, undefined],
    ["gpt-6-luna", "high", "high", undefined],
    ["gpt-6-luna", "none", "none", 0.7],
    ["gpt-6-astra", "none", undefined, undefined],
    ["gpt-5.6-sol", "default", undefined, undefined],
    ["gpt-5.6-sol", "max", "max", undefined],
    ["gpt-5.6-sol", "none", "none", 0.7],
    ["gpt-5.6-terra", "default", undefined, undefined],
    ["gpt-5.6-terra", "max", "max", undefined],
    ["gpt-5.6-terra", "none", "none", 0.7],
    ["gpt-5.6-luna", "default", undefined, undefined],
    ["gpt-5.6-luna", "max", "max", undefined],
    ["gpt-5.6-luna", "none", "none", 0.7],
  ]) {
    let request;
    const updates = [];
    await withFetch(
      async (url, options) => {
        assert.equal(new URL(url).pathname, "/v1/responses");
        request = JSON.parse(options.body);
        return openAIResponseStream();
      },
      async () => {
        const result = await generateActionResponse(
          { ...action(model), reasoningLevel: level },
          "Test",
          new AbortController().signal,
          (text) => updates.push(text),
        );
        assert.deepEqual(result, { text: "Hello", tokens: { input: 11, output: 7, total: 18 } });
      },
    );
    assert.equal(request.model, model);
    assert.equal(request.reasoning?.effort, expectedLevel);
    assert.equal(request.temperature, expectedTemperature);
    assert.equal(request.max_output_tokens, 32);
    assert.equal(request.store, false);
    assert.deepEqual(updates, ["Hello"]);
  }
});

test("Gemini requests preserve defaults, apply thinking levels, and count thinking tokens", async () => {
  const { generateActionResponse } = loadSource("src/lib/generateActionResponse.ts", { geminiApiKey: "test-gemini-key" });
  for (const [model, level, expectedThinking] of [
    ["gemini-3.8-flash", "default", undefined],
    ["gemini-3.8-flash", "high", { thinkingLevel: "high" }],
    ["gemini-3.8-flash", "minimal", undefined],
    ["gemini-2.5-flash", "none", { thinkingBudget: 0 }],
  ]) {
    let request;
    await withFetch(
      async (url, options) => {
        assert.equal(new URL(url).pathname, `/v1beta/models/${model}:streamGenerateContent`);
        request = JSON.parse(options.body);
        return eventStream([
          {
            candidates: [{ index: 0, content: { role: "model", parts: [{ text: "Hello" }] }, finishReason: "STOP" }],
            usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 5, thoughtsTokenCount: 2, totalTokenCount: 18 },
          },
        ]);
      },
      async () => {
        const result = await generateActionResponse(
          { ...action(model), reasoningLevel: level },
          "Test",
          new AbortController().signal,
          () => {},
        );
        assert.deepEqual(result, { text: "Hello", tokens: { input: 11, output: 7, total: 18 } });
      },
    );
    assert.deepEqual(request.generationConfig.thinkingConfig, expectedThinking);
    assert.equal(request.generationConfig.temperature, 0.7);
    assert.equal(request.generationConfig.maxOutputTokens, 32);
  }
});

test("existing GPT-4o actions keep Chat Completions, temperature, and their instructions", async () => {
  const { generateActionResponse } = loadSource("src/lib/generateActionResponse.ts", { apikey: "test-openai-key" });
  for (const model of ["gpt-4o", "gpt-4o-mini"]) {
    await withFetch(
      async (url, options) => {
        assert.equal(new URL(url).pathname, "/v1/chat/completions");
        const request = JSON.parse(options.body);
        assert.equal(request.model, model);
        assert.equal(request.temperature, 0.7);
        assert.equal(request.max_tokens, 32);
        assert.equal(request.reasoning_effort, undefined);
        assert.ok(request.messages.some((message) => message.role === "system" && message.content === "Reply briefly."));
        return eventStream([
          {
            id: "chat-test",
            created: 1,
            model,
            choices: [{ index: 0, delta: { role: "assistant", content: "Hello" }, finish_reason: null }],
          },
          {
            id: "chat-test",
            created: 1,
            model,
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
          },
        ]);
      },
      async () => {
        const result = await generateActionResponse(
          { ...action(model), reasoningLevel: "high" },
          "Test",
          new AbortController().signal,
          () => {},
        );
        assert.deepEqual(result, { text: "Hello", tokens: { input: 11, output: 7, total: 18 } });
      },
    );
  }
});

test("provider errors and cancelled responses do not become completed results", async () => {
  const { generateActionResponse } = loadSource("src/lib/generateActionResponse.ts", { apikey: "test-openai-key" });
  await withFetch(
    async () =>
      new Response(JSON.stringify({ error: { message: "Model is unavailable", type: "invalid_request_error" } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    async () =>
      assert.rejects(
        generateActionResponse(action(), "Test", new AbortController().signal, () => assert.fail("An error cannot produce text")),
        /Model is unavailable/,
      ),
  );
  const controller = new AbortController();
  await withFetch(
    async () => openAIResponseStream(),
    async () => assert.rejects(generateActionResponse(action(), "Test", controller.signal, () => controller.abort())),
  );
});

test("invalid backups cannot replace saved actions", async () => {
  const saved = { state: { actions: [action("gpt-4o-mini")] }, version: 5 };
  for (const backup of [
    { name: "other-app", version: 5, actions: [] },
    { name: "alice-ai-config", actions: [] },
    { name: "alice-ai-config", version: 6, actions: [] },
    { name: "alice-ai-config", version: 5, actions: null },
    { name: "alice-ai-config", version: 5, actions: [null] },
    { name: "alice-ai-config", version: 5, actions: [{ ...action(), systemPrompt: null }] },
  ]) {
    const storage = new Map([["actions", JSON.stringify(saved)]]);
    const { default: Backup } = loadSource("src/services/Backup.ts", {}, storage, {
      "@raycast/utils": {
        runAppleScript: async () => {
          await new Promise((resolve) => setImmediate(resolve));
          return JSON.stringify(backup);
        },
      },
    });
    await Backup.import();
    assert.deepEqual(JSON.parse(storage.get("actions")), saved);
  }
});

test("valid backup imports migrate retired models and preserve prompts, favorites, and reasoning", async () => {
  const imported = { ...action("gemini-3-pro-preview"), reasoningLevel: "high" };
  const storage = new Map();
  const { default: Backup } = loadSource("src/services/Backup.ts", {}, storage, {
    "@raycast/utils": {
      runAppleScript: async () => {
        await new Promise((resolve) => setImmediate(resolve));
        return JSON.stringify({ name: "alice-ai-config", version: 4, actions: [imported] });
      },
    },
  });
  await Backup.import();
  assert.deepEqual(JSON.parse(storage.get("actions")), {
    state: { actions: [{ ...imported, model: "gemini-3.1-pro-preview" }] },
    version: 5,
  });
});
