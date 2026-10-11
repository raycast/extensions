import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  undo: vi.fn<(tokens: string[]) => Promise<ApiResult<unknown>>>(),
  toast: {} as Record<string, unknown>,
}));

vi.mock("@raycast/api", () => ({
  showToast: async (options: Record<string, unknown>) => Object.assign(mock.toast, options),
  Toast: { Style: { Failure: "failure", Success: "success", Animated: "animated" } },
}));

vi.mock("../src/lib/api", () => ({
  undo: mock.undo,
}));

import type { Toast } from "@raycast/api";
import type { ApiResult } from "../src/lib/api";
import { applyUndoToast, describeError, runMutation } from "../src/lib/feedback";

type ToastState = {
  style?: string;
  title?: string;
  message?: string | undefined;
  primaryAction?: {
    title: string;
    shortcut: { modifiers: string[]; key: string };
    onAction: (toast: ToastState) => Promise<void>;
  };
};

beforeEach(() => {
  mock.undo.mockReset();
});

// Guards the primary defect: after a successful undo the action must be
// detached so ⌘Z cannot re-send undo([token]) with a consumed token.
it("clears primaryAction after a successful undo so ⌘Z cannot re-fire undo()", async () => {
  mock.undo.mockResolvedValue({ ok: true, data: {} });
  const toast: ToastState = {};
  applyUndoToast(toast as unknown as Toast, "tok-1");

  await toast.primaryAction!.onAction(toast);

  expect(mock.undo).toHaveBeenCalledTimes(1);
  expect(mock.undo).toHaveBeenCalledWith(["tok-1"]);
  expect(toast.primaryAction).toBeUndefined();
  expect(toast.style).toBe("success");
  expect(toast.title).toBe("Undid the change");
  expect(toast.message).toBeUndefined();
});

// Guards the post-undo toast: a message that a caller set on the toast must not stay.
it("drops a stale caller-set message on the post-undo toast", async () => {
  mock.undo.mockResolvedValue({ ok: true, data: {} });
  const toast: ToastState = {};
  applyUndoToast(toast as unknown as Toast, "tok-1");
  toast.message = "Refresh to see the change.";

  await toast.primaryAction!.onAction(toast);

  expect(toast.title).toBe("Undid the change");
  expect(toast.message).toBeUndefined();
});

// Guards the retry path: a failed undo must keep the action attached so the
// user can press ⌘Z again.
it("keeps primaryAction attached on a failed undo so the user can retry", async () => {
  mock.undo.mockResolvedValue({ ok: false, code: "network", message: "offline" });
  const toast: ToastState = {};
  applyUndoToast(toast as unknown as Toast, "tok-1");

  await toast.primaryAction!.onAction(toast);

  expect(mock.undo).toHaveBeenCalledTimes(1);
  expect(toast.style).toBe("failure");
  expect(toast.title).toBe("Could not undo the change");
  expect(toast.primaryAction).toBeDefined();
});

// Reverting the newer change makes the original token usable again.
it("explains a stale undo refusal and retries after the newer change is undone", async () => {
  mock.undo.mockResolvedValueOnce({ ok: false, code: "stale", message: "A newer change touched it.", status: 409 });
  mock.undo.mockResolvedValueOnce({ ok: true, data: {} });
  const onSpent = vi.fn();
  const onUndone = vi.fn();
  const toast: ToastState = {};
  const run = applyUndoToast(toast as unknown as Toast, "tok-1", { onSpent, onUndone });

  await toast.primaryAction!.onAction(toast);

  expect(toast.style).toBe("failure");
  expect(toast.title).toBe("The block changed since then");
  expect(toast.message).toBe("A newer change touched it.");
  expect(toast.primaryAction).toBeDefined();
  expect(onSpent).not.toHaveBeenCalled();
  expect(onUndone).not.toHaveBeenCalled();

  // Another client undoes the newer edit before this retry.
  await toast.primaryAction!.onAction(toast);

  expect(mock.undo.mock.calls).toEqual([[["tok-1"]], [["tok-1"]]]);
  expect(toast.style).toBe("success");
  expect(toast.title).toBe("Undid the change");
  expect(toast.message).toBeUndefined();
  expect(toast.primaryAction).toBeUndefined();
  expect(onSpent).not.toHaveBeenCalled();
  expect(onUndone).toHaveBeenCalledTimes(1);
  await run();
  expect(mock.undo).toHaveBeenCalledTimes(2);
});

// A spent token is final. The caller hears it once, and a later run sends nothing.
it("reports a spent token to the caller and sends no second undo", async () => {
  mock.undo.mockResolvedValue({ ok: false, code: "validation", message: "This token was already used.", status: 422 });
  const onSpent = vi.fn();
  const onUndone = vi.fn();
  const toast: ToastState = {};
  const run = applyUndoToast(toast as unknown as Toast, "tok-1", { onSpent, onUndone });

  await run();
  await run();

  expect(mock.undo).toHaveBeenCalledTimes(1);
  expect(toast.title).toBe("Could not undo the change");
  expect(toast.primaryAction).toBeUndefined();
  expect(onSpent).toHaveBeenCalledTimes(1);
  expect(onUndone).not.toHaveBeenCalled();
});

it.each([
  ["conflict", "Could not undo the change"],
  ["stale", "The block changed since then"],
  ["internal", "Could not undo the change"],
])("a 2xx undo with error code %s stays retryable until a successful receipt", async (code, title) => {
  mock.undo.mockResolvedValueOnce({
    ok: true,
    data: { results: [{ index: 0, status: "error", error: { code, message: "The undo was refused." } }] },
  });
  mock.undo.mockResolvedValueOnce({ ok: true, data: { results: [{ index: 0, status: "ok" }] } });
  const onSpent = vi.fn();
  const onUndone = vi.fn();
  const toast: ToastState = {};
  const run = applyUndoToast(toast as unknown as Toast, "tok-1", { onSpent, onUndone });

  await toast.primaryAction!.onAction(toast);

  expect(toast).toMatchObject({ style: "failure", title, message: "The undo was refused." });
  expect(toast.primaryAction).toBeDefined();
  expect(onSpent).not.toHaveBeenCalled();
  expect(onUndone).not.toHaveBeenCalled();

  await run();

  expect(mock.undo.mock.calls).toEqual([[["tok-1"]], [["tok-1"]]]);
  expect(toast.style).toBe("success");
  expect(toast.title).toBe("Undid the change");
  expect(toast.message).toBeUndefined();
  expect(toast.primaryAction).toBeUndefined();
  expect(onSpent).not.toHaveBeenCalled();
  expect(onUndone).toHaveBeenCalledTimes(1);
  await run();
  expect(mock.undo).toHaveBeenCalledTimes(2);
});

it.each(["validation", "not_found"])(
  "a 2xx undo with a %s row retires the token without reporting success",
  async (code) => {
    mock.undo.mockResolvedValue({
      ok: true,
      data: { results: [{ index: 0, status: "error", error: { code, message: "This token is no longer usable." } }] },
    });
    const onSpent = vi.fn();
    const onUndone = vi.fn();
    const toast: ToastState = {};
    const run = applyUndoToast(toast as unknown as Toast, "tok-1", { onSpent, onUndone });

    await run();
    await run();

    expect(mock.undo).toHaveBeenCalledTimes(1);
    expect(toast).toMatchObject({
      style: "failure",
      title: "Could not undo the change",
      message: "This token is no longer usable.",
    });
    expect(toast.primaryAction).toBeUndefined();
    expect(onSpent).toHaveBeenCalledTimes(1);
    expect(onUndone).not.toHaveBeenCalled();
  },
);

it("finalises the toast after a retry that follows a failed undo", async () => {
  mock.undo.mockResolvedValueOnce({ ok: false, code: "network", message: "offline" });
  mock.undo.mockResolvedValueOnce({ ok: true, data: {} });
  const toast: ToastState = {};
  applyUndoToast(toast as unknown as Toast, "tok-1");

  await toast.primaryAction!.onAction(toast);
  expect(toast.title).toBe("Could not undo the change");
  expect(toast.primaryAction).toBeDefined();

  await toast.primaryAction!.onAction(toast);
  expect(mock.undo).toHaveBeenCalledTimes(2);
  expect(toast.title).toBe("Undid the change");
  expect(toast.primaryAction).toBeUndefined();
});

it("ignores queued duplicate actions during undo and after success", async () => {
  let finish!: (result: ApiResult<unknown>) => void;
  mock.undo.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
  const toast: ToastState = {};
  applyUndoToast(toast as unknown as Toast, "tok-1");
  const action = toast.primaryAction!;

  const pending = action.onAction(toast);
  expect(toast.primaryAction).toBeUndefined();
  expect(toast.title).toBe("Undoing…");
  await action.onAction(toast);
  expect(mock.undo).toHaveBeenCalledTimes(1);

  finish({ ok: true, data: {} });
  await pending;
  await action.onAction(toast);
  expect(mock.undo).toHaveBeenCalledTimes(1);
  expect(toast.primaryAction).toBeUndefined();
  expect(toast.title).toBe("Undid the change");
});

it("restores the action after a rejected request and allows a successful retry", async () => {
  mock.undo.mockRejectedValueOnce(new Error("Unexpected failure"));
  mock.undo.mockResolvedValueOnce({ ok: true, data: {} });
  const toast: ToastState = {};
  applyUndoToast(toast as unknown as Toast, "tok-1");
  const action = toast.primaryAction!;

  await action.onAction(toast);
  expect(toast.style).toBe("failure");
  expect(toast.title).toBe("Could not undo the change");
  expect(toast.primaryAction).toBe(action);

  await toast.primaryAction!.onAction(toast);
  expect(mock.undo).toHaveBeenCalledTimes(2);
  expect(toast.style).toBe("success");
  expect(toast.primaryAction).toBeUndefined();
});

// The feedback cap is 30 per hour, so "wait a moment" is wrong there. Show the
// server reason, and keep the generic hint only for a bare 429.
it("rate_limited shows the server message and falls back for a bare 429", () => {
  const capped = describeError({ ok: false, code: "rate_limited", message: "Try again in an hour.", status: 429 });
  expect(capped).toEqual({ title: "Too many requests", message: "Try again in an hour." });
  const bare = describeError({ ok: false, code: "rate_limited", message: "Request failed (429).", status: 429 });
  expect(bare).toEqual({ title: "Too many requests", message: "Wait a moment, then try again." });
});

it("runMutation reads the success title and message from the receipt", async () => {
  mock.toast = {};
  const receipt = { results: [{ index: 0, status: "ok" as const }], undoToken: "tok" };
  const result = await runMutation(
    "Saving…",
    (data: typeof receipt) => ({ title: `Added ${data.results.length}`, message: "a · b" }),
    async () => ({ ok: true, data: receipt }),
  );
  expect(result).toEqual({ ok: true, undoToken: "tok" });
  expect(mock.toast).toMatchObject({ style: "success", title: "Added 1", message: "a · b" });
});
