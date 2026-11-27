import { describe, expect, it } from "vitest";
import { isTransient, needsWindow, RunFailure, toRunFailure } from "../../src/commands/failure";
import { errorFromStatus } from "../../src/providers/http";
import { ProviderError } from "../../src/core/errors";
import { RenderError } from "../../src/prompts/template/render";

describe("toRunFailure", () => {
  it("keeps an existing failure", () => {
    const failure = new RunFailure("no-selection", "No Text Selected", "Select text.");
    expect(toRunFailure(failure)).toBe(failure);
  });

  it("titles provider errors and masks secrets", () => {
    const failure = toRunFailure(new ProviderError("auth", "Bad key sk-ant-abcdefghijkl", "anthropic", 401));
    expect(failure.title).toBe("Invalid API Key");
    expect(failure.message).not.toContain("sk-ant-abcdefghijkl");
  });

  it("maps empty renders to their own kind", () => {
    expect(toRunFailure(new RenderError("empty-input", "Nothing to send.")).kind).toBe("empty-input");
  });

  it("masks secrets in unknown errors", () => {
    expect(toRunFailure(new Error("Bearer abcdefghijklmnop")).message).toContain("[redacted]");
  });
});

describe("needsWindow", () => {
  it("opens a window only for problems a HUD cannot resolve", () => {
    expect(needsWindow(new RunFailure("auth", "t", "m"))).toBe(true);
    expect(needsWindow(new RunFailure("missing-key", "t", "m"))).toBe(true);
    expect(needsWindow(new RunFailure("model-not-found", "t", "m"))).toBe(true);
    expect(needsWindow(new RunFailure("no-default-model", "t", "m"))).toBe(true);
    expect(needsWindow(new RunFailure("no-strict-endpoint", "t", "m"))).toBe(true);
    expect(needsWindow(new RunFailure("network", "t", "m"))).toBe(false);
  });
});

describe("titles and messages", () => {
  it("does not repeat the title in the message", () => {
    const failure = toRunFailure(errorFromStatus("openrouter", 401, ""));
    expect(failure.title).toBe("Invalid API Key");
    expect(failure.message).not.toContain("Invalid API Key");
  });

  it("calls missing credits what they are", () => {
    expect(toRunFailure(errorFromStatus("openrouter", 402, "")).title).toBe("Out of Credits");
  });
});

describe("isTransient", () => {
  it("offers a retry only where one can help", () => {
    expect(isTransient(new RunFailure("network", "t", "m"))).toBe(true);
    expect(isTransient(new RunFailure("rate-limit", "t", "m"))).toBe(true);
    expect(isTransient(new RunFailure("auth", "t", "m"))).toBe(false);
    expect(isTransient(new RunFailure("out-of-credits", "t", "m"))).toBe(false);
  });
});
