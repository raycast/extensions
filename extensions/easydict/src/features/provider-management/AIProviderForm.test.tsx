// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OpenAICompatibleProfile } from "@/providers/profiles/types";

import { AIProviderForm } from "./AIProviderForm";

const testDoubles = vi.hoisted(() => ({
  cache: new Map<string, string>(),
  fetch:
    vi.fn<(url: string, options: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<unknown>>(),
  showToast: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@xsai/stream-text", () => ({ streamText: testDoubles.streamText }));
vi.mock("@/shared/http", () => ({ timedFetch: testDoubles.fetch }));
vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));
vi.mock("@raycast/api", async () => {
  const { createElement } = await import("react");
  const group = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  const action = ({ title, onAction, onSubmit }: { title: string; onAction?: () => void; onSubmit?: () => void }) =>
    createElement("button", { onClick: onAction ?? onSubmit }, title);
  const input = ({
    id,
    title,
    value,
    onChange,
  }: {
    id: string;
    title: string;
    value: string;
    onChange: (value: string) => void;
  }) =>
    createElement("input", {
      id,
      "aria-label": title,
      value,
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    });
  const dropdown = ({
    id,
    title,
    value,
    children,
    isLoading,
    onChange,
    onFocus,
  }: {
    id: string;
    title: string;
    value: string;
    children?: ReactNode;
    isLoading?: boolean;
    onChange: (value: string) => void;
    onFocus?: () => void;
  }) =>
    createElement(
      "select",
      {
        id,
        "aria-label": title,
        value,
        "data-loading": isLoading,
        onFocus,
        onChange: (event: { target: { value: string } }) => onChange(event.target.value),
      },
      children,
    );
  return {
    AI: { Model: {} },
    Action: Object.assign(action, { SubmitForm: action }),
    ActionPanel: group,
    Form: Object.assign(
      ({ children, actions }: { children?: ReactNode; actions?: ReactNode }) =>
        createElement("div", null, actions, children),
      {
        TextField: input,
        PasswordField: input,
        Description: () => null,
        Dropdown: Object.assign(dropdown, {
          Item: ({ title, value }: { title: string; value: string }) => createElement("option", { value }, title),
          Section: ({ title, children }: { title: string; children?: ReactNode }) =>
            createElement("optgroup", { label: title }, children),
        }),
      },
    ),
    Icon: { Bolt: "bolt", SaveDocument: "save" },
    Toast: { Style: { Failure: "failure", Animated: "animated", Success: "success" } },
    Cache: class {
      get(key: string) {
        return testDoubles.cache.get(key);
      }
      set(key: string, value: string) {
        testDoubles.cache.set(key, value);
      }
    },
    environment: { isDevelopment: false },
    getPreferenceValues: () => ({}),
    showToast: testDoubles.showToast,
    useNavigation: () => ({ pop: vi.fn() }),
  };
});

beforeEach(() => {
  vi.useFakeTimers();
  testDoubles.cache.clear();
  testDoubles.fetch.mockReset();
  testDoubles.showToast.mockReset().mockImplementation(async (options) => ({ ...options }));
  testDoubles.streamText.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AI provider form model discovery", () => {
  it.each(["https://opencode.ai/zen/v1", "https://opencode.ai/zen/go/v1/chat/completions"])(
    "keeps the loaded public catalog when credentials change for %s",
    async (endpoint) => {
      testDoubles.fetch.mockResolvedValue({ data: [{ id: "public-model" }] });
      render(<AIProviderForm profile={createProfile(endpoint, "")} onSave={vi.fn()} />);

      await advanceTimers(300);
      expect(modelOptions()).toContain("public-model");
      expect(testDoubles.fetch).toHaveBeenCalledTimes(1);

      fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "entered-key" } });
      fireEvent.focus(screen.getByLabelText("Model"));
      await advanceTimers(300);

      expect(testDoubles.fetch).toHaveBeenCalledTimes(1);
      expect(modelOptions()).toContain("public-model");
      expect(testDoubles.fetch.mock.calls[0][1]).not.toHaveProperty("headers");
    },
  );

  it("keeps the public request in flight when credentials change and focus overlaps the timer", async () => {
    const pending = deferred();
    testDoubles.fetch.mockReturnValue(pending.promise);
    render(<AIProviderForm profile={createProfile("https://opencode.ai/zen/v1", "")} onSave={vi.fn()} />);

    await advanceTimers(299);
    expect(testDoubles.fetch).not.toHaveBeenCalled();
    fireEvent.focus(screen.getByLabelText("Model"));
    const signal = testDoubles.fetch.mock.calls[0][1].signal;
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "entered-key" } });
    fireEvent.focus(screen.getByLabelText("Model"));
    await advanceTimers(300);

    expect(signal?.aborted).toBe(false);
    expect(testDoubles.fetch).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({ data: [{ id: "public-model" }] }));
    expect(modelOptions()).toContain("public-model");
    expect(screen.getByLabelText("Model").getAttribute("data-loading")).toBe("false");
  });

  it("does not reload a catalog when the endpoint changes to an equivalent completion URL", async () => {
    testDoubles.fetch.mockResolvedValue({ data: [{ id: "private-model" }] });
    render(<AIProviderForm profile={createProfile("https://example.com/v1")} onSave={vi.fn()} />);
    await advanceTimers(300);

    fireEvent.change(screen.getByLabelText("API Base URL"), {
      target: { value: "https://example.com/v1/chat/completions/" },
    });
    fireEvent.focus(screen.getByLabelText("Model"));
    await advanceTimers(300);

    expect(testDoubles.fetch).toHaveBeenCalledTimes(1);
    expect(modelOptions()).toContain("private-model");
  });

  it("waits for private credentials and the 300 ms delay before loading models", async () => {
    testDoubles.fetch.mockResolvedValue({ data: [{ id: "private-model" }] });
    render(<AIProviderForm profile={createProfile("https://example.com/v1", "")} onSave={vi.fn()} />);
    fireEvent.focus(screen.getByLabelText("Model"));
    await advanceTimers(300);
    expect(testDoubles.fetch).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "entered-key" } });
    await advanceTimers(299);
    expect(testDoubles.fetch).not.toHaveBeenCalled();
    await advanceTimers(1);

    expect(testDoubles.fetch).toHaveBeenCalledWith("https://example.com/v1/models", {
      headers: { Authorization: "Bearer entered-key" },
      signal: expect.any(AbortSignal),
    });
    expect(modelOptions()).toContain("private-model");
  });

  it("isolates private model lists by credential and restores the matching cached list", async () => {
    testDoubles.fetch
      .mockResolvedValueOnce({ data: [{ id: "first-model" }] })
      .mockResolvedValueOnce({ data: [{ id: "second-model" }] });
    render(<AIProviderForm profile={createProfile("https://example.com/v1", "first-key")} onSave={vi.fn()} />);
    await advanceTimers(300);

    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "second-key" } });
    expect(modelOptions()).not.toContain("first-model");
    await advanceTimers(300);
    expect(modelOptions()).toContain("second-model");
    expect(testDoubles.fetch.mock.calls[1][1].headers).toEqual({ Authorization: "Bearer second-key" });

    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "first-key" } });
    expect(modelOptions()).toContain("first-model");
    expect(modelOptions()).not.toContain("second-model");
  });

  it("reports an invalid endpoint without fetching and loads models once it is corrected", async () => {
    testDoubles.fetch.mockResolvedValue({ data: [{ id: "private-model" }] });
    render(<AIProviderForm profile={createProfile("not a URL")} onSave={vi.fn()} />);
    await advanceTimers(300);
    expect(testDoubles.fetch).not.toHaveBeenCalled();
    expect(testDoubles.showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Unable to fetch models" }));

    fireEvent.change(screen.getByLabelText("API Base URL"), { target: { value: "https://example.com/v1" } });
    await advanceTimers(300);
    expect(modelOptions()).toContain("private-model");
  });

  it("keeps cached models after a failed refresh and retries when the model field is focused", async () => {
    const profile = createProfile("https://example.com/v1");
    testDoubles.fetch
      .mockResolvedValueOnce({ data: [{ id: "cached-model" }] })
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({ data: [{ id: "refreshed-model" }] });
    const firstForm = render(<AIProviderForm profile={profile} onSave={vi.fn()} />);
    await advanceTimers(300);
    firstForm.unmount();
    render(<AIProviderForm profile={profile} onSave={vi.fn()} />);
    expect(modelOptions()).toContain("cached-model");

    await advanceTimers(300);
    expect(modelOptions()).toContain("cached-model");
    expect(testDoubles.showToast).toHaveBeenCalledTimes(1);
    expect(testDoubles.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Unable to fetch models",
        message: "Network unavailable",
      }),
    );

    await act(async () => fireEvent.focus(screen.getByLabelText("Model")));
    expect(testDoubles.fetch).toHaveBeenCalledTimes(3);
    expect(modelOptions()).toContain("refreshed-model");
  });

  it("removes old endpoint options and ignores its late response without clearing the current loading state", async () => {
    const oldRequest = deferred();
    const currentRequest = deferred();
    testDoubles.fetch
      .mockResolvedValueOnce({ data: [{ id: "first-model" }] })
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(currentRequest.promise);
    render(<AIProviderForm profile={createProfile("https://first.example/v1")} onSave={vi.fn()} />);
    await advanceTimers(300);

    fireEvent.change(screen.getByLabelText("API Base URL"), { target: { value: "https://old.example/v1" } });
    expect(modelOptions()).not.toContain("first-model");
    await advanceTimers(300);
    const oldSignal = testDoubles.fetch.mock.calls[1][1].signal;
    fireEvent.change(screen.getByLabelText("API Base URL"), { target: { value: "https://current.example/v1" } });
    expect(oldSignal?.aborted).toBe(true);
    await advanceTimers(300);

    await act(async () => oldRequest.resolve({ data: [{ id: "stale-model" }] }));
    expect(modelOptions()).not.toContain("stale-model");
    expect(screen.getByLabelText("Model").getAttribute("data-loading")).toBe("true");
    await act(async () => currentRequest.resolve({ data: [{ id: "current-model" }] }));
    expect(modelOptions()).toContain("current-model");
    expect(screen.getByLabelText("Model").getAttribute("data-loading")).toBe("false");
    expect(testDoubles.showToast).not.toHaveBeenCalled();
  });

  it("cancels an in-flight request on unmount without showing a failure toast", async () => {
    const pending = deferred();
    testDoubles.fetch.mockReturnValue(pending.promise);
    const form = render(<AIProviderForm profile={createProfile("https://example.com/v1")} onSave={vi.fn()} />);
    await advanceTimers(300);
    const signal = testDoubles.fetch.mock.calls[0][1].signal;

    form.unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => pending.reject(new Error("Cancelled request")));
    expect(testDoubles.showToast).not.toHaveBeenCalled();
  });
});

describe("AI provider form runtime configuration", () => {
  it("tests a keyless draft with normalized request parameters and saves only profile data", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const profile = { ...createProfile(" http://localhost:8080/v1/chat/completions/ ", "  "), model: " model " };
    testDoubles.streamText.mockReturnValue({ textStream: textStream("你好") });
    render(<AIProviderForm profile={profile} onSave={onSave} isNewProvider />);

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Test & Save Provider" })));

    expect(testDoubles.streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://localhost:8080/v1",
        model: "model",
      }),
    );
    expect(testDoubles.streamText.mock.calls[0][0]).not.toHaveProperty("apiKey");
    expect(onSave).toHaveBeenCalledWith({
      ...profile,
      endpoint: "http://localhost:8080/v1/chat/completions/",
      website: undefined,
      apiKey: "",
      model: "model",
    });
  });

  it("saves a tested dictionary fallback using the draft identity and preserves its editable fields", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const profile: OpenAICompatibleProfile = {
      ...createProfile("https://example.com/v1", "key"),
      model: "model",
      website: "https://example.com",
      wordResultMode: "dictionary",
      jsonOutputMode: "json-object",
      icon: { kind: "remote", url: "https://example.com/icon.png" },
    };
    testDoubles.streamText
      .mockImplementationOnce(() => {
        throw new Error("response_format json_object is not supported");
      })
      .mockReturnValueOnce({ textStream: textStream(JSON.stringify({ translation: "你好", entry: null })) });
    render(<AIProviderForm profile={profile} onSave={onSave} isNewProvider />);

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Test & Save Provider" })));

    expect(testDoubles.streamText).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenCalledWith({ ...profile, jsonOutputMode: "prompt" });
    expect(screen.getByLabelText("JSON Output")).toHaveProperty("value", "prompt");
  });

  it("keeps an unavailable Raycast model visible and reports the same configuration issue before testing", async () => {
    const onSave = vi.fn();
    render(
      <AIProviderForm
        profile={{
          id: "raycast",
          name: "Raycast",
          adapter: "raycast-ai",
          model: "unavailable",
          enabled: true,
          order: 0,
          wordResultMode: "translation",
          icon: { kind: "preset", name: "raycast" },
        }}
        onSave={onSave}
      />,
    );
    expect(modelOptions()).toContain("unavailable");

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Test Provider" })));

    expect(testDoubles.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Provider configuration is incomplete",
        message: "Choose an available Raycast AI model.",
      }),
    );
    expect(onSave).not.toHaveBeenCalled();
    expect(testDoubles.streamText).not.toHaveBeenCalled();
  });
});

async function* textStream(text: string) {
  yield text;
}

function createProfile(endpoint: string, apiKey = "private-key"): OpenAICompatibleProfile {
  return {
    id: "profile",
    name: "Provider",
    adapter: "openai-compatible",
    enabled: true,
    order: 0,
    icon: { kind: "initials" },
    wordResultMode: "translation",
    endpoint,
    apiKey,
    model: "",
    tokenLimitMode: "max-tokens",
    jsonOutputMode: "prompt",
  };
}

function modelOptions() {
  return Array.from(screen.getByLabelText<HTMLSelectElement>("Model").options, (option) => option.value);
}

async function advanceTimers(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<unknown>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
