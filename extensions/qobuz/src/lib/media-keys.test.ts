import { describe, it, expect, vi, beforeEach } from "vitest";
import { execFile } from "node:child_process";
import { MEDIA_KEY_CODES, SCRIPT, sendMediaKey, type MediaKey } from "./media-keys";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

const mockExecFile = vi.mocked(execFile);

const succeed = () => {
  mockExecFile.mockImplementation(((...args: unknown[]) => {
    const callback = args[args.length - 1] as (error: Error | null) => void;
    callback(null);
  }) as typeof execFile);
};

const failWithStderr = (stderr: string) => {
  mockExecFile.mockImplementation(((...args: unknown[]) => {
    const callback = args[args.length - 1] as (error: Error | null) => void;
    callback(Object.assign(new Error("command failed"), { stderr }));
  }) as typeof execFile);
};

describe("sendMediaKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    succeed();
  });

  it.each(Object.entries(MEDIA_KEY_CODES) as [MediaKey, number][])(
    "sends %s as osascript JXA with code %i",
    async (key, code) => {
      await sendMediaKey(key);

      expect(mockExecFile).toHaveBeenCalledOnce();
      expect(mockExecFile).toHaveBeenCalledWith(
        "osascript",
        ["-l", "JavaScript", "-e", SCRIPT, String(code)],
        expect.any(Function),
      );
    },
  );

  it("maps not-trusted stderr to the Accessibility message", async () => {
    failWithStderr("execution error: Error: not-trusted (-2700)\n");

    await expect(sendMediaKey("play")).rejects.toThrow(
      "Raycast needs Accessibility access: System Settings → Privacy & Security → Accessibility",
    );
  });

  it("passes other stderr through trimmed", async () => {
    failWithStderr("  some failure  \n");

    await expect(sendMediaKey("next")).rejects.toThrow("some failure");
  });

  it("falls back when stderr is empty", async () => {
    failWithStderr("");

    await expect(sendMediaKey("rewind")).rejects.toThrow("failed to send media key: rewind");
  });
});
