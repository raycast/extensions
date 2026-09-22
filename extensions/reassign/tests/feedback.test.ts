import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  undo: vi.fn<(tokens: string[]) => Promise<{ ok: boolean; data?: unknown }>>(),
}));

vi.mock("@raycast/api", () => ({
  Toast: { Style: { Failure: "failure", Success: "success", Animated: "animated" } },
}));

vi.mock("../src/lib/api", () => ({
  undo: mock.undo,
}));

import type { Toast } from "@raycast/api";
import { applyUndoToast } from "../src/lib/feedback";

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

// Guards the composite applyCalendar symptom: a message set on the toast after
// applyUndoToast registers must not survive onto the post-undo toast.
it("drops a stale caller-set message on the post-undo toast", async () => {
  mock.undo.mockResolvedValue({ ok: true, data: {} });
  const toast: ToastState = {};
  applyUndoToast(toast as unknown as Toast, "tok-1");
  toast.message = "The calendar did not apply. Pick it with Edit Details.";

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
  let finish!: (result: { ok: boolean }) => void;
  mock.undo.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
  const toast: ToastState = {};
  applyUndoToast(toast as unknown as Toast, "tok-1");
  const action = toast.primaryAction!;

  const pending = action.onAction(toast);
  expect(toast.primaryAction).toBeUndefined();
  expect(toast.title).toBe("Undoing…");
  await action.onAction(toast);
  expect(mock.undo).toHaveBeenCalledTimes(1);

  finish({ ok: true });
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
