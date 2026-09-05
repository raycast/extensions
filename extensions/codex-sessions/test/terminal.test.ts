import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({})),
  showToast: vi.fn(),
  Toast: { Style: { Failure: "failure" } },
}));
vi.mock("@raycast/utils", () => ({
  executeSQL: vi.fn(),
  runAppleScript: vi.fn(),
}));

import { buildResumeCommand, escapeAppleScript, escapeShell } from "../src/lib/terminal";

describe("terminal command escaping", () => {
  it("quotes shell values containing apostrophes", () => {
    expect(escapeShell("it's ready")).toBe("'it'\\''s ready'");
  });

  it("escapes AppleScript backslashes, quotes, and line breaks", () => {
    expect(escapeAppleScript('a\\b"c\n\r')).toBe('a\\\\b\\"c\\n\\r');
  });

  it("quotes binary, cwd, and thread id with spaces and Japanese text", () => {
    expect(
      buildResumeCommand(
        "/Users/test/日本語 tools/codex binary",
        "/tmp/日本語 project/with spaces",
        "thread id 日本語",
      ),
    ).toBe(
      "cd -- '/tmp/日本語 project/with spaces' && '/Users/test/日本語 tools/codex binary' resume 'thread id 日本語'",
    );
  });

  it("omits cd when the working directory is unavailable", () => {
    expect(buildResumeCommand("/usr/local/bin/codex", undefined, "thread-id")).toBe(
      "'/usr/local/bin/codex' resume 'thread-id'",
    );
    expect(buildResumeCommand("/usr/local/bin/codex", undefined, "thread-id")).not.toContain("cd --");
  });
});
