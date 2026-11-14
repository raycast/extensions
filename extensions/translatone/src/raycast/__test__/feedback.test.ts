import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { Toast } from "@raycast/api";
import type { DiagnosticContext } from "../../core/diagnostics";
import { NoProviderConfiguredError, ProviderError } from "../../core/errors";
import { providerConfig } from "../../core/__test__/test-helpers";
import { showTranslationError } from "../feedback";
import { raycast } from "./test-helpers";

const context: DiagnosticContext = {
  command: "translate",
  tone: "default",
  targetLanguage: "en",
  textLength: 5,
  providers: [providerConfig("groq")],
};

function trigger(action: Toast.ActionOptions | undefined): void {
  if (action?.onAction === undefined) {
    throw new Error("Expected the toast action to exist");
  }
  action.onAction(Object.create(null));
}

describe("showTranslationError", () => {
  const consoleError = spyOn(console, "error");

  beforeEach(() => {
    raycast.reset();
    consoleError.mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockReset();
  });

  test("opens Manage Providers when no provider is configured", async () => {
    await showTranslationError(new NoProviderConfiguredError(), context);

    expect(raycast.toasts[0]).toMatchObject({
      style: "FAILURE",
      title: "No provider configured",
      primaryAction: { title: "Manage Providers" },
      secondaryAction: { title: "Copy Debug Info" },
    });

    trigger(raycast.toasts[0]?.primaryAction);

    expect(raycast.events).toContain("launch:manage-providers:userInitiated");
  });

  test("points to preferences for an invalid key and keeps the debug report", async () => {
    const error = new ProviderError("groq", "unauthorized", "bad key", { status: 401 });

    await showTranslationError(error, context);

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('"status": 401'));
    expect(raycast.toasts[0]).toMatchObject({
      style: "FAILURE",
      title: "Translation failed",
      message: "Groq: invalid API key",
      primaryAction: { title: "Manage Providers" },
      secondaryAction: { title: "Copy Debug Info" },
    });

    trigger(raycast.toasts[0]?.secondaryAction);
    await Bun.sleep(0);

    expect(raycast.clipboard).toHaveLength(1);
    expect(raycast.clipboard[0]).toContain('"reason": "unauthorized"');
    expect(raycast.clipboard[0]).not.toContain("groq-key");
    expect(raycast.toasts[1]).toMatchObject({ style: "SUCCESS", title: "Debug info copied" });
  });

  test("offers a retry for a temporary failure", async () => {
    const onRetry = mock(() => undefined);

    await showTranslationError(new ProviderError("groq", "rate_limited", "slow"), context, onRetry);

    expect(raycast.toasts[0]).toMatchObject({
      primaryAction: { title: "Retry" },
      secondaryAction: { title: "Copy Debug Info" },
    });

    trigger(raycast.toasts[0]?.primaryAction);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("explains when Manage Providers cannot be launched", async () => {
    raycast.launchError = new Error("Command is disabled");
    await showTranslationError(new NoProviderConfiguredError(), context);

    trigger(raycast.toasts[0]?.primaryAction);
    await Bun.sleep(0);

    expect(raycast.toasts[1]).toMatchObject({
      style: "FAILURE",
      title: "Could not open Manage Providers",
      message: expect.stringContaining("disabled"),
    });
  });

  test("redacts secrets before logging errors or showing generic error messages", async () => {
    await showTranslationError(
      new Error("Rejected groq-key at https://user:pass@test.invalid/v1?token=secret"),
      context,
    );

    const logged: unknown = consoleError.mock.calls[0]?.[0];
    expect(typeof logged).toBe("string");
    expect(String(logged)).not.toContain("groq-key");
    expect(String(logged)).not.toContain("user:pass");
    expect(String(logged)).not.toContain("token=secret");
    expect(raycast.toasts[0]?.message).toBe("Rejected [REDACTED] at https://test.invalid/v1");
  });

  test("falls back to the debug report when retrying is not possible", async () => {
    await showTranslationError(new ProviderError("groq", "rate_limited", "slow"), context);

    expect(raycast.toasts[0]?.primaryAction?.title).toBe("Copy Debug Info");
    expect(raycast.toasts[0]?.secondaryAction).toBeUndefined();
  });
});
