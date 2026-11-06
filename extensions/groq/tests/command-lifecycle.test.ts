import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encode } from "gpt-tokenizer";
import type { ChatData } from "../src/hook/AIChat.types";
import type { Metrics } from "../src/hook/ResultView.types";

// Exercise the command callbacks without Raycast's native renderer. State and refs
// survive explicit renders, and effects run only when the test mounts the command.
const harness = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  stateIndex: 0,
  refIndex: 0,
  effects: [] as (() => (() => void) | void)[],
  create: vi.fn(),
  showToast: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  showMetadata: true,
}));

vi.mock("react", () => ({
  useState(initial: unknown) {
    const index = harness.stateIndex++;
    if (!(index in harness.states)) harness.states[index] = initial;
    return [
      harness.states[index],
      (update: unknown) => {
        harness.states[index] = typeof update === "function" ? update(harness.states[index]) : update;
      },
    ];
  },
  useRef(initial: unknown) {
    const index = harness.refIndex++;
    harness.refs[index] ??= { current: initial };
    return harness.refs[index];
  },
  useEffect(effect: () => (() => void) | void) {
    harness.effects.push(effect);
  },
  useCallback: (callback: unknown) => callback,
  useMemo: (factory: () => unknown) => factory(),
}));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ model_chat: "global" }),
  getSelectedText: vi.fn(),
  showToast: harness.showToast,
  Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
  Icon: {},
  Alert: { ActionStyle: {} },
  confirmAlert: vi.fn(),
  LocalStorage: { getItem: harness.getItem, setItem: harness.setItem },
  useNavigation: () => ({ pop: vi.fn() }),
  Detail: Object.assign(() => null, {
    Metadata: Object.assign(() => null, { Label: "label", Separator: "separator" }),
  }),
  List: Object.assign(() => null, {
    EmptyView: "empty-view",
    Dropdown: Object.assign(() => null, { Item: "dropdown-item" }),
    Item: Object.assign(() => null, { Detail: "item-detail" }),
  }),
  Form: {},
  ActionPanel: Object.assign(() => null, { Section: "section", Submenu: "submenu" }),
  Action: Object.assign(() => null, {
    Push: "push",
    CopyToClipboard: "copy",
    Paste: "paste",
    Style: { Destructive: "destructive" },
  }),
}));

vi.mock("../src/hook/configAPI", () => ({
  openai: { chat: { completions: { create: harness.create } } },
  global_model: "qwen/qwen3.8-27b",
  enable_streaming: true,
  get show_metadata() {
    return harness.showMetadata;
  },
}));

import Chat from "../src/aiChat";
import ResultView from "../src/hook/accessAPI";
import { buildSystemPrompt, buildUserPrompt, countToken } from "../src/hook/utils";
import * as utils from "../src/hook/utils";

function render<T>(component: () => T): T {
  harness.stateIndex = 0;
  harness.refIndex = 0;
  harness.effects = [];
  return component();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function mountResultView() {
  render(() =>
    ResultView({
      sys_prompt: "Be helpful",
      selected_text: "Context",
      user_extra_msg: "Explain this",
      model_override: "global",
      toast_title: "Thinking",
    }),
  );
  return harness.effects[0]();
}

beforeEach(() => {
  vi.resetAllMocks();
  harness.states = [];
  harness.refs = [];
  harness.effects = [];
  harness.showMetadata = true;
  harness.setItem.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("result view prompt metrics", () => {
  it.each(["empty completion", "empty stream", "reasoning-only stream"])(
    "records prompt tokens for an %s",
    async (kind) => {
      const toast = { style: "animated", title: "", hide: vi.fn() };
      harness.showToast.mockResolvedValue(toast);
      harness.create.mockResolvedValue(
        kind === "empty completion"
          ? { choices: [{ message: { content: "" } }] }
          : {
              async *[Symbol.asyncIterator]() {
                if (kind === "reasoning-only stream") yield { choices: [{ delta: { reasoning: "Thinking" } }] };
              },
            },
      );
      const cleanup = mountResultView();
      await vi.waitFor(() => expect(toast.style).toBe("success"));
      const metrics = harness.states[2] as Metrics;
      expect(metrics.promptTokens).toBe(
        countToken(buildSystemPrompt("Be helpful") + buildUserPrompt("Explain this", "Context")),
      );
      expect(metrics.promptTokens).toBeGreaterThan(0);
      expect(metrics.responseTokens).toBe(0);
      expect(harness.states[1]).toBe(false);
      cleanup?.();
    },
  );
});

describe("result view response metrics", () => {
  it.each([true, false])("keeps tokenization out of streaming updates with metadata %s", async (showMetadata) => {
    vi.useFakeTimers();
    harness.showMetadata = showMetadata;
    const tokenizer = vi.spyOn(utils, "countToken");
    const toast = { style: "animated", title: "", hide: vi.fn() };
    harness.showToast.mockResolvedValue(toast);
    const parts = ["<think>reasoning</think>", ...Array.from({ length: 25 }, () => "long answer ".repeat(100))];
    const rawText = parts.join("");
    harness.create.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        for (const content of parts) {
          yield { choices: [{ delta: { content } }] };
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      },
    });
    const cleanup = mountResultView();

    await vi.advanceTimersByTimeAsync(200);
    expect(harness.states[0]).not.toBe("");
    expect(harness.states[1]).toBe(true);
    expect((harness.states[2] as Metrics).responseTokens).toBe(0);
    expect(tokenizer).toHaveBeenCalledTimes(showMetadata ? 1 : 0);

    await vi.advanceTimersByTimeAsync(100);
    expect(toast.style).toBe("success");
    expect(harness.states[0]).toBe(parts.slice(1).join(""));
    expect(harness.states[1]).toBe(false);
    expect(tokenizer).toHaveBeenCalledTimes(showMetadata ? 2 : 0);
    expect((harness.states[2] as Metrics).responseTokens).toBe(showMetadata ? encode(rawText).length : 0);
    if (showMetadata) expect(tokenizer).toHaveBeenLastCalledWith(rawText);
    cleanup?.();
  });

  it.each(["non-streaming", "interrupted"])("counts the %s response once when the request ends", async (kind) => {
    const tokenizer = vi.spyOn(utils, "countToken");
    const toast = { style: "animated", title: "", hide: vi.fn() };
    const rawText = "<think>reasoning</think>Partial answer";
    harness.showToast.mockResolvedValue(toast);
    harness.create.mockResolvedValue(
      kind === "non-streaming"
        ? { choices: [{ message: { content: rawText } }] }
        : {
            async *[Symbol.asyncIterator]() {
              yield { choices: [{ delta: { content: rawText } }] };
              throw new Error("Connection lost");
            },
          },
    );
    const cleanup = mountResultView();
    await vi.waitFor(() => expect(harness.states[1]).toBe(false));
    expect(toast.style).toBe(kind === "non-streaming" ? "success" : "failure");
    expect(tokenizer).toHaveBeenCalledTimes(2);
    expect(tokenizer).toHaveBeenLastCalledWith(rawText);
    expect((harness.states[2] as Metrics).responseTokens).toBe(encode(rawText).length);
    expect(harness.states[0]).toContain("Partial answer");
    cleanup?.();
  });

  it("does not tokenize the answer after the view is closed", async () => {
    const tokenizer = vi.spyOn(utils, "countToken");
    const toast = { style: "animated", title: "", hide: vi.fn().mockResolvedValue(undefined) };
    const pending = deferred<void>();
    harness.showToast.mockResolvedValue(toast);
    harness.create.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: "Partial answer" } }] };
        await pending.promise;
        yield { choices: [{ delta: { content: "Late answer" } }] };
      },
    });
    const cleanup = mountResultView();
    await vi.waitFor(() => expect(tokenizer).toHaveBeenCalledOnce());
    cleanup?.();
    pending.resolve();
    await vi.waitFor(() => expect(toast.hide).toHaveBeenCalledOnce());
    expect(tokenizer).toHaveBeenCalledOnce();
    expect((harness.states[2] as Metrics).responseTokens).toBe(0);
  });
});

describe("AI Chat cancellation", () => {
  async function openChat() {
    const data: ChatData = {
      currentChat: "Test",
      chats: [{ name: "Test", creationDate: new Date(), messages: [] }],
    };
    harness.getItem.mockResolvedValue(JSON.stringify(data));
    render(Chat);
    const cleanup = harness.effects[0]();
    await vi.waitFor(() => expect(harness.states[2]).toBe(false));
    render(Chat).props.onSearchTextChange("Long question");
    const list = render(Chat);
    const actions = list.props.children.props.actions;
    const panel = actions.type(actions.props);
    return { cleanup, send: () => panel.props.children[0].props.onAction() as Promise<void> };
  }

  it("hides the loading toast when leaving during an active request", async () => {
    const toast = { style: "animated", title: "Response Loading", hide: vi.fn().mockResolvedValue(undefined) };
    harness.showToast.mockResolvedValue(toast);
    harness.create.mockImplementation(
      (_params, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
        }),
    );
    const { send, cleanup } = await openChat();
    const result = send();
    await vi.waitFor(() => expect(harness.create).toHaveBeenCalledOnce());
    cleanup?.();
    await result;
    expect(harness.create.mock.calls[0][1].signal.aborted).toBe(true);
    expect(toast.hide).toHaveBeenCalledOnce();
    expect(harness.showToast).toHaveBeenCalledOnce();
  });

  it("hides a toast that resolves after leaving and does not start a request", async () => {
    const toast = { style: "animated", title: "Response Loading", hide: vi.fn().mockResolvedValue(undefined) };
    const pendingToast = deferred<typeof toast>();
    harness.showToast.mockReturnValue(pendingToast.promise);
    harness.create.mockResolvedValue({ choices: [{ message: { content: "Late answer" } }] });
    const { send, cleanup } = await openChat();
    const result = send();
    cleanup?.();
    pendingToast.resolve(toast);
    await result;
    expect(toast.hide).toHaveBeenCalledOnce();
    expect(harness.create).not.toHaveBeenCalled();
  });
});
