import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { saveEmbeddingConfig, validateEmbeddingConfig } from "./embedding-config";
import { canAutoIndex } from "./semantic";

test("custom embedding base URL and model ID are not restricted to a bundled list", () => {
  const config = validateEmbeddingConfig({ provider: "openai", endpoint: "https://example.com/my/embeddings", model: "my-company/my-model-v2" });
  assert.equal(config.endpoint, "https://example.com/my/embeddings");
  assert.equal(config.model, "my-company/my-model-v2");
  assert.equal(canAutoIndex(config), false);
  const macStudio = validateEmbeddingConfig({ provider: "openai", endpoint: "http://mac-studio.local:1234/v1", model: "my-embed-model" });
  assert.equal(macStudio.endpoint, "http://mac-studio.local:1234/v1");
  assert.equal(macStudio.model, "my-embed-model");
  const remoteOllama = validateEmbeddingConfig({ provider: "ollama", endpoint: "http://192.168.1.40:11434", model: "custom-gguf-embed" });
  assert.equal(remoteOllama.endpoint, "http://192.168.1.40:11434");
});

test("a local MLX import may index automatically without an endpoint", () => {
  assert.equal(canAutoIndex({ provider: "mlx", endpoint: "", model: "" }), true);
  const selected = validateEmbeddingConfig({ provider: "mlx", endpoint: "", model: "agentmish/pplx-embed-v1-0.6b-mlx@edc2b94227d1e4b8e185c1cf6db7d20d6759879b" });
  assert.equal(selected.model, "agentmish/pplx-embed-v1-0.6b-mlx@edc2b94227d1e4b8e185c1cf6db7d20d6759879b");
  assert.throws(() => validateEmbeddingConfig({ provider: "mlx", endpoint: "", model: "Qwen/Qwen3-0.6B" }));
  assert.throws(() => validateEmbeddingConfig({ provider: "ollama", endpoint: "not a URL", model: "custom" }));
});

test("concurrent setting saves use separate temporary files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "docsearch-config-"));
  const path = join(dir, "embedding.json");
  try {
    await Promise.all(Array.from({ length: 8 }, (_, index) =>
      saveEmbeddingConfig({ provider: "mlx", endpoint: "", model: index % 2
        ? "agentmish/pplx-embed-v1-0.6b-mlx@edc2b94227d1e4b8e185c1cf6db7d20d6759879b" : "" }, "", path)));
    const saved = JSON.parse(await readFile(path, "utf8"));
    assert.equal(saved.provider, "mlx");
    assert.ok(["", "agentmish/pplx-embed-v1-0.6b-mlx@edc2b94227d1e4b8e185c1cf6db7d20d6759879b"].includes(saved.model));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
