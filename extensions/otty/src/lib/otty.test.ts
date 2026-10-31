import { describe, expect, it } from "vitest";
import {
  DEFAULT_OTTY_CLI_PATH,
  buildOpenDirectoryArgs,
  buildFinderDirectoryScriptArgs,
  buildOpenDirectoryTabArgs,
  buildRunCommandArgs,
  buildJumpListArgs,
  buildViewFileArgs,
  splitPinned,
  buildSshCommandArgs,
  normalizeSshTarget,
} from "./otty-core";

describe("Otty helper", () => {
  it("uses the installed app bundle CLI as the default", () => {
    expect(DEFAULT_OTTY_CLI_PATH).toBe("/Applications/Otty.app/Contents/MacOS/otty-cli");
  });

  it("builds open-directory args with Otty's path argument", () => {
    expect(buildOpenDirectoryArgs("/tmp/a dir; touch bad")).toEqual(["open", "/tmp/a dir; touch bad"]);
  });

  it("builds open-directory tab args with Otty's cwd option", () => {
    expect(buildOpenDirectoryTabArgs("/tmp/project")).toEqual(["tab", "new", "--cwd", "/tmp/project"]);
  });

  it("builds run-command args with Otty's command option", () => {
    expect(buildRunCommandArgs("npm run dev")).toEqual(["open", "--command", "npm run dev"]);
  });

  it("builds Finder directory script args with a desktop fallback", () => {
    const args = buildFinderDirectoryScriptArgs();

    expect(args[0]).toBe("-e");
    expect(args.join("\n")).toContain("target of front Finder window");
    expect(args.join("\n")).toContain("desktop as alias");
  });

  it("normalizes ssh URL input by stripping the scheme", () => {
    expect(normalizeSshTarget("ssh://ethan@example.com")).toBe("ethan@example.com");
  });

  it("normalizes bare ssh target input", () => {
    expect(normalizeSshTarget("ethan@example.com")).toBe("ethan@example.com");
  });

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

  it("lists the jump database as JSON", () => {
    expect(buildJumpListArgs(200)).toEqual(["jump:ls", "200", "--json"]);
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

  it("keeps a pinned folder that left the jump history", () => {
    const { pinned } = splitPinned([], ["/gone"]);
    expect(pinned).toEqual([{ path: "/gone" }]);
  });

  it("opens a file in Otty's viewer in a new tab", () => {
    expect(buildViewFileArgs("/tmp/notes.md")).toEqual(["view", "/tmp/notes.md", "--new-tab"]);
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
