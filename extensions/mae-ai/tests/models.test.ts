import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { fetchModels, modelsUrl, parseModels } from "../src/lib/models";

test("model discovery selects the local Copilot endpoint or a custom provider's models API", () => {
  assert.equal(
    modelsUrl("http://127.0.0.1:23333/api/openai/v1/"),
    "http://127.0.0.1:23333/api/v1/lm/chatModels",
  );
  assert.equal(
    modelsUrl("https://provider.example/v1"),
    "https://provider.example/v1/models",
  );
  assert.equal(
    modelsUrl("https://provider.example/v1/chat/completions"),
    "https://provider.example/v1/models",
  );
  assert.throws(() => modelsUrl("https://user:key@provider.example/v1"));
});

test("Copilot discovery filters unsupported vendors, deduplicates IDs, and retains display names", () => {
  const models = parseModels([
    { id: "auto", name: "Auto", vendor: "copilot" },
    { id: "auto", name: "CLI Auto", vendor: "copilotcli" },
    { id: "gpt-test", name: "GPT Test", vendor: "copilot" },
    { id: "gpt-test", name: "Duplicate", vendor: "copilot" },
    { id: "copilot-utility", name: "Internal alias", vendor: "copilot" },
    { id: "", name: "Invalid" },
    null,
  ]);
  assert.deepEqual(models, [
    { id: "auto", name: "Auto" },
    { id: "gpt-test", name: "GPT Test" },
  ]);
  assert.deepEqual(parseModels({ data: [{ id: "custom-model" }] }), [
    { id: "custom-model", name: "custom-model" },
  ]);
  assert.throws(() => parseModels({ message: "Invalid" }));
  assert.deepEqual(
    parseModels([{ id: "custom-array-model", vendor: "custom" }]),
    [{ id: "custom-array-model", name: "custom-array-model" }],
  );
  assert.deepEqual(
    parseModels({ data: [{ id: "another-model", vendor: "custom" }] }),
    [{ id: "another-model", name: "another-model" }],
  );
});

test("custom provider discovery uses authentication and returns usable dropdown options", async () => {
  const server = createServer((req, res) => {
    assert.equal(req.url, "/v1/models");
    assert.equal(req.headers.authorization, "Bearer test-key");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ data: [{ id: "small" }, { id: "large" }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const models = await fetchModels(
      {
        baseUrl: `http://127.0.0.1:${address.port}/v1`,
        model: "",
        apiKey: "test-key",
      },
      new AbortController().signal,
    );
    assert.deepEqual(
      models.map((model) => model.id),
      ["large", "small"],
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
