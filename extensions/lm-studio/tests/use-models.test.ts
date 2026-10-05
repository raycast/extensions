import { afterEach, describe, expect, it, vi } from "vitest";

const localStorage = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => localStorage.get(key)),
    setItem: vi.fn(async (key: string, value: string) => localStorage.set(key, value)),
    removeItem: vi.fn(async (key: string) => localStorage.delete(key)),
  },
}));

import {
  DEFAULT_CHAT_MODEL_STORAGE_KEY,
  getDefaultChatModelKey,
  preferredModel,
  setDefaultChatModelKey,
} from "../src/lib/use-models";
import { LMStudioModel } from "../src/types";

function model(key: string, loaded = false): LMStudioModel {
  return {
    type: "llm",
    publisher: "test",
    key,
    displayName: key,
    quantization: null,
    sizeBytes: 1,
    paramsString: null,
    loadedInstances: loaded ? [{ id: `${key}:instance`, config: { contextLength: 4096 } }] : [],
    maxContextLength: 4096,
    format: "gguf",
  };
}

afterEach(() => localStorage.clear());

describe("default chat model", () => {
  it("persists a normalized model key and can clear it", async () => {
    await setDefaultChatModelKey("  publisher/default  ");

    expect(localStorage.get(DEFAULT_CHAT_MODEL_STORAGE_KEY)).toBe("publisher/default");
    await expect(getDefaultChatModelKey()).resolves.toBe("publisher/default");

    await setDefaultChatModelKey();
    await expect(getDefaultChatModelKey()).resolves.toBeUndefined();
  });

  it("prefers the configured model even when another model is loaded", () => {
    const models = [model("loaded", true), model("configured")];

    expect(preferredModel(models, "configured")?.key).toBe("configured");
  });

  it("falls back to a loaded model and then the first available model", () => {
    expect(preferredModel([model("first"), model("loaded", true)], "missing")?.key).toBe("loaded");
    expect(preferredModel([model("first"), model("second")])?.key).toBe("first");
    expect(preferredModel([])).toBeUndefined();
  });
});
