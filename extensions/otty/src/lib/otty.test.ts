import { describe, expect, it } from "vitest";
import {
  buildCaptureArgs,
  buildConfigGetArgs,
  buildConfigSetArgs,
  buildConfigUnsetArgs,
  buildFocusArgs,
  buildJumpListArgs,
  buildListArgs,
  buildNewTabArgs,
  buildOpenWindowArgs,
  buildPaneLinkArgs,
  buildRunCommandArgs,
  buildSendTextArgs,
  buildSshCommandArgs,
  buildViewFileArgs,
  rankByRecentVisits,
  splitPinned,
} from "./otty-core";

describe("CLI args", () => {
  it.each([
    [buildOpenWindowArgs(), ["open"]],
    [buildOpenWindowArgs("/tmp/a dir; touch bad"), ["open", "/tmp/a dir; touch bad"]],
    [buildNewTabArgs(), ["tab", "new"]],
    [buildNewTabArgs("/tmp/project"), ["tab", "new", "--cwd", "/tmp/project"]],
    [buildRunCommandArgs("npm run dev"), ["open", "--command", "npm run dev"]],
    [buildListArgs("window"), ["window", "list", "--json"]],
    [buildFocusArgs("pane", "p_1"), ["pane", "focus", "p_1"]],
    [buildPaneLinkArgs("p_1"), ["pane", "link", "--pane", "p_1"]],
    [buildCaptureArgs("p_1", 30), ["pane", "capture", "--pane", "p_1", "--lines", "30", "--trim"]],
    [buildJumpListArgs(200), ["jump:ls", "200", "--json"]],
    [buildViewFileArgs("/tmp/notes.md"), ["view", "/tmp/notes.md", "--new-tab"]],
    [buildConfigGetArgs("font-size"), ["config", "get", "font-size"]],
    [buildConfigUnsetArgs("font-size"), ["config", "unset", "font-size"]],
  ])("builds %j", (args, expected) => {
    expect(args).toEqual(expected);
  });

  it("puts `--` before a config value, so `-1` isn't read as a flag", () => {
    expect(buildConfigSetArgs("font-size", "-1")).toEqual(["config", "set", "font-size", "--", "-1"]);
  });

  it("queues text verbatim, even when it looks like a flag", () => {
    expect(buildSendTextArgs("p_1", "--help \\n")).toEqual([
      "pane",
      "send-text",
      "--pane",
      "p_1",
      "--no-escape",
      "--submit",
      "--",
      "--help \\n",
    ]);
  });
});

describe("Otty helper", () => {
  it("connects through Otty's native ssh command", () => {
    expect(buildSshCommandArgs("ethan@example.com")).toEqual(["connect", "ethan@example.com"]);
    expect(buildSshCommandArgs("ssh://ethan@example.com")).toEqual(["connect", "ethan@example.com"]);
  });

  it("passes ssh options through as separate arguments", () => {
    expect(buildSshCommandArgs("  -p 2222   ethan@example.com ")).toEqual([
      "connect",
      "-p",
      "2222",
      "ethan@example.com",
    ]);
  });

  it("never hands the target to a shell", () => {
    expect(buildSshCommandArgs("example.com; open -a Calculator")).toEqual([
      "connect",
      "example.com;",
      "open",
      "-a",
      "Calculator",
    ]);
  });

  it("puts pinned folders first, in pin order, and keeps the rest ranked", () => {
    const entries = [
      { path: "/a", last_seen: 1, score: 30 },
      { path: "/b", last_seen: 2, score: 20 },
      { path: "/c", last_seen: 3, score: 10 },
    ];
    const { pinned, others } = splitPinned(entries, ["/c", "/a"]);
    expect(pinned.map((e) => e.path)).toEqual(["/c", "/a"]);
    expect(others.map((e) => e.path)).toEqual(["/b"]);
  });

  it("ranks this week's folders above one that was busy months ago", () => {
    const day = 24 * 60 * 60;
    const now = 200 * day;
    const ranked = rankByRecentVisits(
      [
        // Otty's own order: the stale folder's score is only divided by 4.
        { path: "/imported", last_seen: now - 104 * day, raw_score: 9999, score: 2499.75 },
        { path: "/today", last_seen: now - 3 * 60 * 60, raw_score: 5, score: 10 },
        { path: "/last-week", last_seen: now - 8 * day, raw_score: 20.8, score: 5.2 },
      ],
      now,
    );
    expect(ranked.map((e) => e.path)).toEqual(["/last-week", "/today", "/imported"]);
  });

  it("orders exact ties by path, whatever order Otty returns them in", () => {
    const alpha = { path: "/alpha", last_seen: 100, raw_score: 1, score: 1 };
    const beta = { path: "/beta", last_seen: 100, raw_score: 1, score: 1 };
    expect(rankByRecentVisits([beta, alpha], 200).map((e) => e.path)).toEqual(["/alpha", "/beta"]);
    expect(rankByRecentVisits([alpha, beta], 200).map((e) => e.path)).toEqual(["/alpha", "/beta"]);
  });

  it("falls back to Otty's score when the raw score is missing", () => {
    const ranked = rankByRecentVisits(
      [
        { path: "/a", last_seen: 100, score: 1 },
        { path: "/b", last_seen: 100, score: 2 },
      ],
      100,
    );
    expect(ranked.map((e) => e.path)).toEqual(["/b", "/a"]);
  });

  it("keeps a pinned folder that left the jump history", () => {
    const { pinned } = splitPinned([], ["/gone"]);
    expect(pinned).toEqual([{ path: "/gone" }]);
  });

  it("keeps quoted ssh arguments together, without a shell", () => {
    expect(buildSshCommandArgs(`-i "/Users/me/Keys/work key" -o 'ProxyCommand=nc %h %p' user@host`)).toEqual([
      "connect",
      "-i",
      "/Users/me/Keys/work key",
      "-o",
      "ProxyCommand=nc %h %p",
      "user@host",
    ]);
  });

  it("rejects an unmatched quote", () => {
    expect(() => buildSshCommandArgs(`-i "/Users/me/key user@host`)).toThrow(/unmatched quote/i);
  });

  it("honors backslash escapes outside single quotes", () => {
    expect(buildSshCommandArgs("-i /Users/me/Keys/work\\ key user@host")).toEqual([
      "connect",
      "-i",
      "/Users/me/Keys/work key",
      "user@host",
    ]);
    expect(buildSshCommandArgs('-i "/Users/me/a \\"q\\" key" host')).toEqual([
      "connect",
      "-i",
      '/Users/me/a "q" key',
      "host",
    ]);
    expect(buildSshCommandArgs("-o 'Proxy=a\\b' host")).toEqual(["connect", "-o", "Proxy=a\\b", "host"]);
  });

  it("treats \\$ and \\` inside double quotes as escapes, like a shell", () => {
    expect(buildSshCommandArgs('-i "/Users/me/work\\$key" host')).toEqual([
      "connect",
      "-i",
      "/Users/me/work$key",
      "host",
    ]);
    expect(buildSshCommandArgs('-i "/a/b\\`c" host')).toEqual(["connect", "-i", "/a/b`c", "host"]);
  });
});
