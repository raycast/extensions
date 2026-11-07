import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { homedir } from "node:os";
import { providerSettings, requireProvider, modelKey } from "../src/lib/compatible-images/provider-settings";

test("custom provider never inherits the existing OpenAI key or requires it", () => {
  const existing = { apiKey: "openai-secret", imageApiBaseUrl: "https://provider.example/v1" };
  const provider = providerSettings(existing);
  assert.equal(provider.apiKey, "");
  assert.throws(() => requireProvider(provider), /Image Provider API Key/);
  const configured = providerSettings({ ...existing, imageApiKey: " provider-secret " });
  assert.equal(requireProvider(configured).apiKey, "provider-secret");
  assert.equal(
    requireProvider(providerSettings({ imageApiBaseUrl: existing.imageApiBaseUrl, imageApiKey: "other-key" })).apiKey,
    "other-key"
  );
  assert.equal(configured.outputDirectory, join(homedir(), "Pictures", "OpenAI Generator"));
  assert.equal(
    providerSettings({ imageOutputDirectory: "/tmp/provider-images" }).outputDirectory,
    "/tmp/provider-images"
  );
});

test("saved models are isolated by provider and credentials, with no plaintext key in storage names", () => {
  const p = providerSettings({ imageApiBaseUrl: "https://one.example/v1", imageApiKey: "provider-secret" });
  assert.equal(modelKey(p), modelKey({ ...p, baseUrl: p.baseUrl + "/" }));
  assert.notEqual(modelKey(p), modelKey({ ...p, apiKey: "new-key" }));
  assert.notEqual(modelKey(p), modelKey({ ...p, baseUrl: "https://two.example/v1" }));
  assert.ok(!modelKey(p).includes(p.apiKey));
  assert.throws(() => requireProvider({ ...p, baseUrl: "http://remote.example/v1" }), /HTTPS/);
});
