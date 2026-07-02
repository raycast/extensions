import assert from "node:assert/strict";
import { defaultAppSettings, sanitizeAppSettings } from "./app-settings";
import { defaultApiSettings, sanitizeApiSettings } from "./api-settings";
import { buildCompatibleUrl, getCompatibilityProfile, normalizeApiBase } from "./api-compatibility";
import { buildModelListUrlCandidates, buildModelsUrl, parseModelList } from "./model-list";
import { buildPromptMessages, buildToolVariables, renderTemplate, resolveWorkflow } from "./tool-runtime";
import { validateApiConnection } from "./api-validation";

const openaiProfile = getCompatibilityProfile("openai");
assert.equal(openaiProfile.chatPath, "/chat/completions");
assert.equal(openaiProfile.modelsPath, "/models");
assert.equal(openaiProfile.title, "OpenAI");

const claudeProfile = getCompatibilityProfile("claude");
assert.equal(claudeProfile.chatPath, "/messages");
assert.equal(claudeProfile.modelsPath, "/models");
assert.equal(claudeProfile.title, "Claude");

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

assert.equal(defaultApiSettings.apiCompatible, "openai");
assert.equal(defaultAppSettings.defaultOutputLanguage, "zh-Hans");
assert.equal(sanitizeAppSettings({ maxHistorySize: -1 }).maxHistorySize, 30);
assert.equal(sanitizeAppSettings({ defaultOutputLanguage: "ja", ocrLevel: "fast" }).ocrLevel, "fast");
assert.equal(
  sanitizeApiSettings({ apiBase: "https://x.test/v1/", apiKey: " k ", apiCompatible: "openai" }).apiBase,
  "https://x.test/v1",
);
assert.equal(sanitizeApiSettings({ apiBase: "", apiKey: "", apiCompatible: "claude" }).apiBase, "");

assert.equal(buildModelsUrl({ apiBase: "https://x.test/v1", apiCompatible: "openai" }), "https://x.test/v1/models");
assert.deepEqual(buildModelListUrlCandidates({ apiBase: "https://x.test/v1", apiCompatible: "openai" }), [
  "https://x.test/v1/models",
  "https://x.test/models",
]);
assert.deepEqual(
  parseModelList({ data: [{ id: "gpt-4.1" }, { id: "gpt-4o-mini" }] }, "openai").map((model) => model.id),
  ["gpt-4.1", "gpt-4o-mini"],
);
assert.deepEqual(parseModelList({ data: [{ id: "claude-sonnet-4-5", display_name: "Claude Sonnet" }] }, "claude"), [
  { id: "claude-sonnet-4-5", name: "Claude Sonnet" },
]);
assert.deepEqual(parseModelList({ models: ["claude-sonnet-4"] }, "claude"), [
  { id: "claude-sonnet-4", name: "claude-sonnet-4" },
]);

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

async function testClaudeValidationFlow() {
  const validationCalls: { url: string; headers?: Record<string, string>; body?: string }[] = [];
  const validationResult = await validateApiConnection(
    { apiBase: "https://api.anthropic.com/v1", apiKey: "claude-key", apiCompatible: "claude" },
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
  assert.equal(validationCalls[1].headers?.["x-api-key"], "claude-key");
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
      apiCompatible: "claude",
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

Promise.all([testOpenAIValidationFlow(), testClaudeValidationFlow(), testValidationModelFallbackFlow()]).catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
