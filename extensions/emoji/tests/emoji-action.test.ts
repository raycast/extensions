import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  Clipboard: { copy: vi.fn(), paste: vi.fn() },
  closeMainWindow: vi.fn(),
  showHUD: vi.fn(),
}));
vi.mock("@raycast/api", () => api);
import { performEmojiAction } from "../src/emoji-action";

beforeEach(() => vi.resetAllMocks());

describe("emoji actions", () => {
  it.each(["copy", "paste"] as const)(
    "awaits %s and persistence before updating recents and dismissing Raycast",
    async (action) => {
      const steps: string[] = [];
      let release: (ids: string[]) => void = () => undefined;
      const saved = new Promise<string[]>((resolve) => {
        release = resolve;
      });
      api.Clipboard[action].mockImplementation(async () => {
        steps.push(action);
      });
      const history = {
        record: vi.fn(async () => {
          steps.push("save");
          return saved;
        }),
      };
      const onRecorded = vi.fn(() => {
        steps.push("update");
      });
      api.closeMainWindow.mockImplementation(async () => {
        steps.push("close");
      });
      let finished = false;
      const pending = performEmojiAction("🫡", action, history, onRecorded).then(() => {
        finished = true;
      });
      await vi.waitFor(() => expect(history.record).toHaveBeenCalledOnce());
      expect(finished).toBe(false);
      expect(api.closeMainWindow).not.toHaveBeenCalled();
      expect(onRecorded).not.toHaveBeenCalled();
      release(["🫡", "🚀"]);
      await pending;
      expect(api.Clipboard[action]).toHaveBeenCalledWith("🫡");
      expect(history.record).toHaveBeenCalledWith("🫡");
      expect(onRecorded).toHaveBeenCalledWith(["🫡", "🚀"]);
      expect(steps).toEqual([action, "save", "update", "close"]);
      expect(api.showHUD).not.toHaveBeenCalled();
    },
  );

  it("records the emoji identifier rather than the copied shortcode", async () => {
    const history = { record: vi.fn(async () => ["🫡"]) };
    await performEmojiAction("🫡", "copy", history, vi.fn(), "saluting_face");
    expect(api.Clipboard.copy).toHaveBeenCalledWith("saluting_face");
    expect(history.record).toHaveBeenCalledWith("🫡");
    expect(api.closeMainWindow).toHaveBeenCalledOnce();
  });

  it.each(["copy", "paste"] as const)("does not record a failed %s", async (action) => {
    api.Clipboard[action].mockRejectedValueOnce(new Error("clipboard unavailable"));
    const history = { record: vi.fn() };
    const onRecorded = vi.fn();
    await performEmojiAction("🫡", action, history, onRecorded);
    expect(history.record).not.toHaveBeenCalled();
    expect(onRecorded).not.toHaveBeenCalled();
    expect(api.closeMainWindow).not.toHaveBeenCalled();
    expect(api.showHUD).toHaveBeenCalledWith("Could not " + action + " emoji");
  });

  it.each(["copy", "paste"] as const)(
    "reports a history failure after successful %s without changing displayed recents",
    async (action) => {
      const history = { record: vi.fn().mockRejectedValueOnce(new Error("storage unavailable")) };
      const onRecorded = vi.fn();
      await performEmojiAction("🫡", action, history, onRecorded);
      expect(api.Clipboard[action]).toHaveBeenCalledWith("🫡");
      expect(onRecorded).not.toHaveBeenCalled();
      expect(api.closeMainWindow).not.toHaveBeenCalled();
      expect(api.showHUD).toHaveBeenCalledWith(
        "Emoji " + (action === "copy" ? "copied" : "pasted") + ", but recent history could not be saved",
      );
    },
  );
});
