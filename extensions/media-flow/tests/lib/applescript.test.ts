import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../src/lib/exec", () => ({ execSafe: vi.fn() }));
import { execSafe } from "../../src/lib/exec";
import { runAppleScript } from "../../src/lib/applescript";

beforeEach(() => vi.mocked(execSafe).mockReset());

describe("runAppleScript", () => {
  it("invokes osascript -e with the script", async () => {
    vi.mocked(execSafe).mockResolvedValue("ok");
    const out = await runAppleScript('tell app "Music" to get player state');
    expect(out).toBe("ok");
    expect(execSafe).toHaveBeenCalledWith(
      "osascript",
      ["-e", 'tell app "Music" to get player state'],
      { timeoutMs: 1500 },
    );
  });
  it("propagates null", async () => {
    vi.mocked(execSafe).mockResolvedValue(null);
    expect(await runAppleScript("beep")).toBeNull();
  });
});
