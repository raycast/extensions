import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogger, sanitizeLogFields } from "./logger";

describe("sanitizeLogFields", () => {
  it("redacts fields that may contain secrets or user text", () => {
    expect(
      sanitizeLogFields({
        apiKey: "secret",
        prompt: "translate this",
        word: "private",
        model: "gemini-3-flash-preview",
        attemptMs: 123,
      }),
    ).toEqual({
      apiKey: "[redacted]",
      prompt: "[redacted]",
      word: "[redacted]",
      model: "gemini-3-flash-preview",
      attemptMs: 123,
    });
  });

  it("keeps useful non-sensitive nested diagnostics", () => {
    expect(
      sanitizeLogFields({
        rateLimit: {
          quotaMetric: "generativelanguage.googleapis.com/generate_content_requests",
          quotaId: "GenerateRequestsPerMinutePerProjectPerModel",
          quotaDimensions: { model: "gemini-3-flash-preview", location: "global" },
        },
      }),
    ).toEqual({
      rateLimit: {
        quotaMetric: "generativelanguage.googleapis.com/generate_content_requests",
        quotaId: "GenerateRequestsPerMinutePerProjectPerModel",
        quotaDimensions: { model: "gemini-3-flash-preview", location: "global" },
      },
    });
  });

  it("does not preserve arbitrary Error messages that may contain user data", () => {
    expect(sanitizeLogFields({ error: new Error("Command failed with private text") })).toEqual({
      error: { name: "Error" },
    });
  });
});

describe("createLogger", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("writes scoped structured logs when explicitly enabled", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const logger = createLogger("test-scope", { enabled: true });

    logger.debug("event", { model: "m", apiKey: "secret" });

    expect(debug).toHaveBeenCalledWith("[test-scope] event", { model: "m", apiKey: "[redacted]" });
  });

  it("stays silent by default when NODE_ENV is not 'development'", () => {
    process.env.NODE_ENV = "production";
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const logger = createLogger("test-scope");

    logger.debug("event", { model: "m" });

    expect(debug).not.toHaveBeenCalled();
  });

  it("emits by default when NODE_ENV is 'development'", () => {
    process.env.NODE_ENV = "development";
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const logger = createLogger("test-scope");

    logger.debug("event", { model: "m" });

    expect(debug).toHaveBeenCalledWith("[test-scope] event", { model: "m" });
  });

  it("explicit enabled: false overrides a development environment", () => {
    process.env.NODE_ENV = "development";
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const logger = createLogger("test-scope", { enabled: false });

    logger.debug("event", { model: "m" });

    expect(debug).not.toHaveBeenCalled();
  });

  it("omits the fields argument entirely when there are no fields to log", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const logger = createLogger("test-scope", { enabled: true });

    logger.debug("event");

    expect(debug).toHaveBeenCalledWith("[test-scope] event");
  });

  it("omits the fields argument when every field is undefined (all stripped by sanitize)", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const logger = createLogger("test-scope", { enabled: true });

    logger.debug("event", { skipped: undefined });

    expect(debug).toHaveBeenCalledWith("[test-scope] event");
  });
});
