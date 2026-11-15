import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  Cache: class {
    get() {
      return undefined;
    }
    set() {}
  },
  getApplications: async () => [],
}));

const { HexError, errorMessage, parseReply } = await import("../src/lib/hex");

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof HexError) return error.code;
    throw error;
  }
  throw new Error("expected a HexError");
}

describe("parseReply", () => {
  it("returns a successful reply", () => {
    const reply = parseReply<{ status: string }>(
      '{"version":4,"status":"done","message":"Started dictation","changed":true}',
      "",
      0,
    );
    expect(reply.status).toBe("done");
  });

  it("throws Hex's own code and message for an error reply", () => {
    const run = () =>
      parseReply(
        '{"version":4,"status":"error","code":"not-running","message":"Hex is not running; run `hex start`"}',
        "",
        3,
      );
    expect(run).toThrow("Hex is not running");
    expect(codeOf(run)).toBe("not-running");
  });

  it("uses stderr when a read command fails without JSON", () => {
    expect(() =>
      parseReply("", 'hex: Could not read the time "bogus"; use today.', 1),
    ).toThrow('Could not read the time "bogus"; use today.');
  });

  it("refuses output that isn't JSON", () => {
    expect(() => parseReply("not json", "", 0)).toThrow(
      "Couldn't read Hex's reply",
    );
  });

  it("reports exit 3 without output as not-running", () => {
    expect(codeOf(() => parseReply("", "", 3))).toBe("not-running");
  });
});

describe("errorMessage", () => {
  it("drops the clause that names a terminal command", () => {
    const error = new HexError(
      "feature-off",
      "Meetings are off; turn them on with `hex settings set meetings.enabled on`",
    );
    expect(errorMessage(error)).toBe("Meetings are off");
  });

  it("keeps the settings path when the command is an alternative", () => {
    const error = new HexError(
      "feature-off",
      "Annotate is off; turn it on in Settings › Annotate or run `hex settings set capture.enabled true`",
    );
    expect(errorMessage(error)).toBe(
      "Annotate is off; turn it on in Settings › Annotate",
    );
  });

  it("strips backticks when every clause names a command", () => {
    const error = new HexError(
      "unsupported",
      "build with `--features capture`",
    );
    expect(errorMessage(error)).toBe("build with --features capture");
  });

  it("keeps messages without commands as they are", () => {
    const error = new HexError("failed", 'Could not read "bogus"; use today.');
    expect(errorMessage(error)).toBe('Could not read "bogus"; use today.');
  });

  it("leaves errors that aren't from Hex alone", () => {
    expect(errorMessage(new Error("ENOENT; `x`"))).toBe("ENOENT; `x`");
  });
});
