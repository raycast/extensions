import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import {
  getOpenAICodexRaycastModels,
  installProvider,
  removeProvider,
} from "../src/lib/provider-yaml.js";

describe("provider yaml", () => {
  it("installs Raycast custom provider without removing existing providers", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "raycast-provider-"));
    const file = path.join(dir, "providers.yaml");
    await fs.writeFile(
      file,
      YAML.stringify({
        providers: [
          {
            id: "existing",
            name: "Existing",
            base_url: "http://example.test",
            models: [],
          },
        ],
      }),
    );

    const result = await installProvider({ port: 18791, providersPath: file });
    const parsed = YAML.parse(await fs.readFile(file, "utf8"));

    expect(result.backupPath).toBeDefined();
    expect(parsed.providers).toHaveLength(2);
    expect(parsed.providers[1]).toMatchObject({
      id: "chatgpt-account",
      name: "ChatGPT Account",
      base_url: "http://127.0.0.1:18791/v1",
    });
    expect(
      parsed.providers[1].models.map((model: { id: string }) => model.id),
    ).toContain("gpt-5.5");
    expect(
      parsed.providers[1].models[0].abilities.system_message.supported,
    ).toBe(true);
  });

  it("removes only the managed provider", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "raycast-provider-"));
    const file = path.join(dir, "providers.yaml");
    await installProvider({ port: 18791, providersPath: file });

    expect(await removeProvider(file)).toBe(true);
    const parsed = YAML.parse(await fs.readFile(file, "utf8"));
    expect(parsed.providers).toEqual([]);
  });

  it("uses the current OpenAI Codex model registry", () => {
    const models = getOpenAICodexRaycastModels();
    expect(models.map((model) => model.id)).toContain("gpt-5.5");
    expect(models.find((model) => model.id === "gpt-5.5")).toMatchObject({
      context: 272000,
      abilities: {
        vision: { supported: true },
        reasoning_effort: { supported: true },
      },
    });
  });
});
