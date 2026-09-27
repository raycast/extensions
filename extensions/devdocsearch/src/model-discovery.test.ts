import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { discoverDownloadedModels, discoverServerModels } from "./model-discovery";

test("lists downloaded models and marks only the supported local embedding model selectable", async () => {
  const root = mkdtempSync(join(tmpdir(), "docsearch-models-"));
  try {
    for (const [repo, modelType] of [["models--agentmish--pplx-embed-v1-0.6b-mlx", "bidirectional_pplx_qwen3"],
      ["models--Qwen--Qwen3-0.6B", "qwen3"]]) {
      const snapshot = join(root, repo, "snapshots", "a".repeat(40));
      mkdirSync(snapshot, { recursive: true });
      writeFileSync(join(snapshot, "config.json"), JSON.stringify({ model_type: modelType }));
      writeFileSync(join(snapshot, "model.safetensors"), "weights");
    }
    const models = await discoverDownloadedModels([root]);
    assert.deepEqual(models.map(({ name, directEmbedding }) => [name, directEmbedding]), [
      ["agentmish/pplx-embed-v1-0.6b-mlx", true], ["Qwen/Qwen3-0.6B", false],
    ]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("discovers downloaded LM Studio embedding models and excludes chat models", async () => {
  const server = createServer((request, response) => {
    if (request.url === "/api/v1/models") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ models: [
        { type: "llm", key: "chat-model", display_name: "Chat" },
        { type: "embedding", key: "embed-model", display_name: "Embedding" },
      ] }));
    } else { response.writeHead(404).end(); }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No server port");
    const models = await discoverServerModels({ provider: "openai", endpoint: `http://127.0.0.1:${address.port}/v1`, model: "" });
    assert.deepEqual(models, [{ id: "embed-model", name: "Embedding" }]);
  } finally { server.close(); }
});

test("discovers models on an OpenAI-compatible server when no native model list exists", async () => {
  const server = createServer((request, response) => {
    if (request.url === "/v1/models") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ data: [{ id: "custom-embed" }, { id: "another-embed", type: "embedding" }] }));
    } else { response.writeHead(404).end(); }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No server port");
    const models = await discoverServerModels({ provider: "openai", endpoint: `http://127.0.0.1:${address.port}/v1`, model: "" });
    assert.deepEqual(models.map(({ id }) => id), ["another-embed", "custom-embed"]);
  } finally { server.close(); }
});

test("discovers Ollama models hosted on another device", async () => {
  const server = createServer((request, response) => {
    if (request.url === "/api/tags") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ models: [{ name: "nomic-embed-text:latest" }, { name: "custom-embedding:latest" }, { name: "chat-model:latest" }] }));
    } else if (request.url === "/api/show") {
      let body = "";
      request.on("data", (part) => { body += part; });
      request.on("end", () => {
        const name = (JSON.parse(body) as { model: string }).model;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ capabilities: [name.startsWith("chat") ? "completion" : "embedding"] }));
      });
    } else { response.writeHead(404).end(); }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No server port");
    const models = await discoverServerModels({ provider: "ollama", endpoint: `http://127.0.0.1:${address.port}`, model: "" });
    assert.deepEqual(models.map(({ id }) => id), ["custom-embedding:latest", "nomic-embed-text:latest"]);
  } finally { server.close(); }
});
