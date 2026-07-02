import assert from "node:assert/strict";
import { defaultAppSettings, sanitizeAppSettings } from "./app-settings";
import { defaultApiSettings, sanitizeApiSettings } from "./api-settings";
import { buildCompatibleUrl, getCompatibilityProfile, normalizeApiBase } from "./api-compatibility";
import { buildRaycastAIPrompt, streamToolCompletion } from "./llm-client";
import { buildModelListUrlCandidates, buildModelsUrl, parseModelList, parseRaycastAIModelEnum } from "./model-list";
import {
  assertNonEmptyToolOutput,
  buildPromptMessages,
  buildToolVariables,
  renderTemplate,
  resolveWorkflow,
} from "./tool-runtime";
import { validateApiConnection } from "./api-validation";
import { createSessionId, createTraceContext, traceHeaders } from "./tracing";
import { buildAISDKProviderModel, buildAISDKProviderHeaders } from "./ai-sdk-provider";

const raycastProfile = getCompatibilityProfile("raycast");
assert.equal(raycastProfile.chatPath, "");
assert.equal(raycastProfile.modelsPath, "");
assert.equal(raycastProfile.defaultApiBase, "");
assert.equal(raycastProfile.title, "Raycast AI");

const openaiProfile = getCompatibilityProfile("openai");
assert.equal(openaiProfile.chatPath, "/chat/completions");
assert.equal(openaiProfile.modelsPath, "/models");
assert.equal(openaiProfile.title, "OpenAI");

const anthropicProfile = getCompatibilityProfile("anthropic");
assert.equal(anthropicProfile.chatPath, "/messages");
assert.equal(anthropicProfile.modelsPath, "/models");
assert.equal(anthropicProfile.title, "Anthropic");

assert.equal(normalizeApiBase("https://api.example.com/v1/"), "https://api.example.com/v1");
assert.equal(buildCompatibleUrl("https://api.example.com/v1/", "/models"), "https://api.example.com/v1/models");

const variables = buildToolVariables({
  input: "hello",
  source: "selected",
  sourceLang: "English",
  targetLang: "简体中文",
  toolName: "Translate",
  now: new Date("2026-07-02T08:00:00.000Z"),
  timezone: "Asia/Shanghai",
  conversation: [{ role: "assistant", content: "previous answer" }],
});

assert.equal(variables.input, "hello");
assert.equal(variables.source, "selected");
assert.equal(variables.toolName, "Translate");
assert.equal(variables.conversation, "assistant: previous answer");
assert.equal(
  renderTemplate("{{toolName}} -> {{input}} -> {{targetLang}}", variables),
  "Translate -> hello -> 简体中文",
);
assert.deepEqual(resolveWorkflow(["input", "prompt", "llm", "renderer"]), [
  { id: "input", title: "Input Normalizer", kind: "builtin" },
  { id: "prompt", title: "Prompt Variables", kind: "prompt" },
  { id: "llm", title: "LLM Call", kind: "llm" },
  { id: "renderer", title: "Markdown Renderer", kind: "render" },
]);

assert.equal(defaultApiSettings.apiCompatible, "raycast");
assert.equal(defaultAppSettings.defaultOutputLanguage, "zh-Hans");
assert.equal(sanitizeAppSettings({ maxHistorySize: -1 }).maxHistorySize, 30);
assert.equal(sanitizeAppSettings({ defaultOutputLanguage: "ja", ocrLevel: "fast" }).ocrLevel, "fast");
assert.equal(sanitizeApiSettings({ apiBase: "", apiKey: "", apiCompatible: "raycast" }).apiBase, "");
assert.equal(
  sanitizeApiSettings({ apiBase: "https://x.test/v1/", apiKey: " k ", apiCompatible: "openai" }).apiBase,
  "https://x.test/v1",
);
assert.equal(sanitizeApiSettings({ apiBase: "", apiKey: "", apiCompatible: "anthropic" }).apiBase, "");

assert.equal(buildModelsUrl({ apiBase: "https://x.test/v1", apiCompatible: "openai" }), "https://x.test/v1/models");
assert.deepEqual(buildModelListUrlCandidates({ apiBase: "https://x.test/v1", apiCompatible: "openai" }), [
  "https://x.test/v1/models",
  "https://x.test/models",
]);
assert.deepEqual(
  parseModelList({ data: [{ id: "gpt-4.1" }, { id: "gpt-4o-mini" }] }, "openai").map((model) => model.id),
  ["gpt-4.1", "gpt-4o-mini"],
);
assert.deepEqual(parseModelList({ data: [{ id: "claude-sonnet-4-5", display_name: "Claude Sonnet" }] }, "anthropic"), [
  { id: "claude-sonnet-4-5", name: "Claude Sonnet" },
]);
assert.deepEqual(parseModelList({ models: ["claude-sonnet-4"] }, "anthropic"), [
  { id: "claude-sonnet-4", name: "claude-sonnet-4" },
]);
assert.deepEqual(
  parseRaycastAIModelEnum({
    "OpenAI_GPT-4o_mini": "openai-gpt-4o-mini",
    "OpenAI_GPT-4o_mini_Deprecated": "openai-gpt-4o-mini",
    "Anthropic_Claude_4.5_Sonnet": "anthropic-claude-sonnet-4-5",
  }).slice(0, 2),
  [
    { id: "openai-gpt-4o-mini", name: "OpenAI GPT-4o mini" },
    { id: "anthropic-claude-sonnet-4-5", name: "Anthropic Claude 4.5 Sonnet" },
  ],
);

const sessionId = createSessionId();
const trace = createTraceContext({
  clientRequestId: "req-20260702-001",
  sessionId,
});
assert.match(sessionId, /^session-[a-f0-9]{32}$/);
assert.match(trace.traceId, /^[a-f0-9]{32}$/);
assert.match(trace.spanId, /^[a-f0-9]{16}$/);
assert.equal(trace.traceparent, `00-${trace.traceId}-${trace.spanId}-01`);
assert.deepEqual(traceHeaders(trace), {
  traceparent: trace.traceparent,
  "x-client-request-id": "req-20260702-001",
  "x-session-id": sessionId,
});
assert.deepEqual(buildAISDKProviderHeaders({ apiBase: "https://x.test/v1", apiKey: "k", apiCompatible: "openai" }), {
  Authorization: "Bearer k",
});
assert.deepEqual(
  buildAISDKProviderHeaders({ apiBase: "https://api.anthropic.com/v1", apiKey: "k", apiCompatible: "anthropic" }),
  {
    "x-api-key": "k",
  },
);
assert.equal(
  buildAISDKProviderModel({ apiBase: "https://x.test/v1", apiKey: "k", apiCompatible: "openai" }, "gpt-test").modelId,
  "gpt-test",
);
assert.equal(
  buildAISDKProviderModel(
    { apiBase: "https://api.anthropic.com/v1", apiKey: "k", apiCompatible: "anthropic" },
    "claude-test",
  ).modelId,
  "claude-test",
);

const messages = buildPromptMessages({
  systemPrompt: "Tool: {{toolName}}",
  userPrompt: "Input: {{input}}",
  variables,
  conversation: [{ role: "assistant", content: "previous answer" }],
  includeConversation: true,
});

assert.deepEqual(
  messages.map((message) => message.role),
  ["system", "assistant", "user"],
);
assert.equal(messages[0].content, "Tool: Translate");
assert.equal(messages[2].content, "Input: hello");
assert.equal(
  buildRaycastAIPrompt(messages),
  "System:\nTool: Translate\n\nConversation:\nassistant: previous answer\n\nUser:\nInput: hello",
);
assert.equal(assertNonEmptyToolOutput("translated text"), "translated text");
assert.throws(() => assertNonEmptyToolOutput(" \n "), /empty response/);

async function testRaycastAIValidationFlow() {
  const progress: string[] = [];
  const validationResult = await validateApiConnection(
    { apiBase: "", apiKey: "", apiCompatible: "raycast" },
    async () => {
      throw new Error("Raycast AI validation must not call HTTP fetch");
    },
    (message) => {
      progress.push(message);
    },
    {
      canAccess: () => true,
      models: {
        "OpenAI_GPT-4o_mini": "openai-gpt-4o-mini",
      },
    },
  );

  assert.deepEqual(progress, ["Checking Raycast AI access", "Checking Raycast AI models"]);
  assert.equal(validationResult.model.id, "openai-gpt-4o-mini");
  assert.equal(validationResult.responseText, "Raycast AI is available");
}

async function testRaycastAIStreamingFlow() {
  const calls: { prompt: string; model?: string; signal?: AbortSignal }[] = [];
  const chunks: string[] = [];
  const raycastStream = Object.assign(Promise.resolve("Hello world"), {
    on(event: "data", listener: (chunk: string) => void) {
      assert.equal(event, "data");
      listener("Hello ");
      listener("world");
    },
  });

  for await (const delta of streamToolCompletion({
    settings: { apiBase: "", apiKey: "", apiCompatible: "raycast" },
    model: "openai-gpt-4o-mini",
    messages,
    signal: new AbortController().signal,
    raycastAI: {
      ask(prompt, options) {
        calls.push({ prompt, model: options?.model as string | undefined, signal: options?.signal });
        return raycastStream;
      },
    },
  })) {
    chunks.push(delta);
  }

  assert.deepEqual(chunks, ["Hello ", "world"]);
  assert.equal(calls[0].model, "openai-gpt-4o-mini");
  assert.match(calls[0].prompt, /System:\nTool: Translate/);
  assert.ok(calls[0].signal instanceof AbortSignal);
}

async function testRaycastAIStreamingFallbackToResolvedText() {
  const chunks: string[] = [];
  const raycastStream = Object.assign(Promise.resolve("Final answer"), {
    on(event: "data", listener: (chunk: string) => void) {
      assert.equal(event, "data");
      assert.equal(typeof listener, "function");
      // Some test clients or future API implementations may only resolve the final text.
    },
  });

  for await (const delta of streamToolCompletion({
    settings: { apiBase: "", apiKey: "", apiCompatible: "raycast" },
    model: "",
    messages,
    signal: new AbortController().signal,
    raycastAI: {
      ask() {
        return raycastStream;
      },
    },
  })) {
    chunks.push(delta);
  }

  assert.deepEqual(chunks, ["Final answer"]);
}

async function testOpenAIStreamingFlow() {
  const chunks: string[] = [];
  const sseCalls: { url: string; body?: string; authorization?: string }[] = [];

  for await (const delta of streamToolCompletion({
    settings: { apiBase: "https://x.test/v1", apiKey: "test-key", apiCompatible: "openai" },
    model: "deepseek/deepseek-v4-pro",
    messages,
    signal: new AbortController().signal,
    sseFetcher: async function* (url, init) {
      sseCalls.push({
        url,
        body: init.body?.toString(),
        authorization: (init.headers as Record<string, string> | undefined)?.Authorization,
      });
      yield Buffer.from('data: {"choices":[{"delta":{"content":"属性"}}]}\n\n');
      yield Buffer.from("data: [DONE]\n\n");
    },
  })) {
    chunks.push(delta);
  }

  assert.deepEqual(chunks, ["属性"]);
  assert.equal(sseCalls[0].url, "https://x.test/v1/chat/completions");
  assert.equal(sseCalls[0].authorization, "Bearer test-key");
  assert.match(sseCalls[0].body ?? "", /deepseek\/deepseek-v4-pro/);
  assert.match(sseCalls[0].body ?? "", /"stream":true/);
}

async function testOpenAIValidationFlow() {
  const validationCalls: { url: string; headers?: Record<string, string>; body?: string }[] = [];
  const validationResult = await validateApiConnection(
    { apiBase: "https://x.test/v1", apiKey: "test-key", apiCompatible: "openai" },
    async (url, init) => {
      validationCalls.push({ url, headers: init?.headers, body: init?.body?.toString() });
      if (url.endsWith("/models")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [{ id: "gpt-test" }] }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "hi" } }] }),
      };
    },
  );

  assert.equal(validationResult.model.id, "gpt-test");
  assert.equal(validationResult.responseText, "hi");
  assert.equal(validationCalls[0].url, "https://x.test/v1/models");
  assert.equal(validationCalls[1].url, "https://x.test/v1/chat/completions");
  assert.equal(validationCalls[1].headers?.Authorization, "Bearer test-key");
  assert.match(validationCalls[1].body ?? "", /hi/);
}

async function testAnthropicValidationFlow() {
  const validationCalls: { url: string; headers?: Record<string, string>; body?: string }[] = [];
  const validationResult = await validateApiConnection(
    { apiBase: "https://api.anthropic.com/v1", apiKey: "anthropic-key", apiCompatible: "anthropic" },
    async (url, init) => {
      validationCalls.push({ url, headers: init?.headers, body: init?.body?.toString() });
      if (url.endsWith("/models")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [{ id: "claude-test", display_name: "Claude Test" }] }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: "text", text: "hi" }] }),
      };
    },
  );

  assert.equal(validationResult.model.id, "claude-test");
  assert.equal(validationResult.model.name, "Claude Test");
  assert.equal(validationResult.responseText, "hi");
  assert.equal(validationCalls[0].url, "https://api.anthropic.com/v1/models");
  assert.equal(validationCalls[1].url, "https://api.anthropic.com/v1/messages");
  assert.equal(validationCalls[1].headers?.["x-api-key"], "anthropic-key");
  assert.equal(validationCalls[1].headers?.["anthropic-version"], "2023-06-01");
  assert.match(validationCalls[1].body ?? "", /hi/);
  assert.match(validationCalls[1].body ?? "", /max_tokens/);
}

async function testValidationModelFallbackFlow() {
  const validationCalls: { url: string; body?: string }[] = [];
  const validationResult = await validateApiConnection(
    {
      apiBase: "http://127.0.0.1:15720/v1",
      apiKey: "cc-switch",
      apiCompatible: "anthropic",
      validatedModel: "claude-sonnet-4",
    },
    async (url, init) => {
      validationCalls.push({ url, body: init?.body?.toString() });
      if (url.endsWith("/models")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ models: [] }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: "text", text: "hi" }] }),
      };
    },
  );

  assert.equal(validationResult.model.id, "claude-sonnet-4");
  assert.equal(validationCalls[0].url, "http://127.0.0.1:15720/v1/models");
  assert.equal(validationCalls[1].url, "http://127.0.0.1:15720/models");
  assert.equal(validationCalls[2].url, "http://127.0.0.1:15720/v1/messages");
  assert.match(validationCalls[2].body ?? "", /claude-sonnet-4/);
}

Promise.all([
  testRaycastAIValidationFlow(),
  testRaycastAIStreamingFlow(),
  testRaycastAIStreamingFallbackToResolvedText(),
  testOpenAIStreamingFlow(),
  testOpenAIValidationFlow(),
  testAnthropicValidationFlow(),
  testValidationModelFallbackFlow(),
]).catch((error) => {
  console.error(error);
  process.exit(1);
});
