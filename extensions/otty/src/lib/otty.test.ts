import { describe, expect, it } from "vitest";
import {
  DEFAULT_OTTY_CLI_PATH,
  buildOpenDirectoryArgs,
  buildFinderDirectoryScriptArgs,
  buildOpenDirectoryTabArgs,
  buildRunCommandArgs,
  normalizeSshTarget,
  shellEscape,
} from "./otty-core";

describe("Otty helper", () => {
  it("uses the installed app bundle CLI as the default", () => {
    expect(DEFAULT_OTTY_CLI_PATH).toBe(
      "/Applications/Otty.app/Contents/MacOS/otty-cli",
    );
  });

  it("builds open-directory args with Otty's path argument", () => {
    const command = buildOpenDirectoryArgs("/tmp/a dir; touch bad");

    expect(command.args).toEqual(["open", "/tmp/a dir; touch bad"]);
    expect(command.args).not.toContain("-e");
    expect(command.env).toBeUndefined();
  });

  it("builds open-directory tab args with Otty's cwd option", () => {
    expect(buildOpenDirectoryTabArgs("/tmp/project")).toEqual([
      "tab",
      "new",
      "--cwd",
      "/tmp/project",
    ]);
  });

  it("builds run-command args with Otty's command option", () => {
    expect(buildRunCommandArgs("npm run dev")).toEqual([
      "open",
      "--command",
      "npm run dev",
    ]);
  });

  it("builds Finder directory script args with a desktop fallback", () => {
    const args = buildFinderDirectoryScriptArgs();

    expect(args[0]).toBe("-e");
    expect(args.join("\n")).toContain("target of front Finder window");
    expect(args.join("\n")).toContain("desktop as alias");
  });

  it("normalizes ssh URL input", () => {
    expect(normalizeSshTarget("ssh://ethan@example.com")).toEqual({
      kind: "url",
      value: "ssh://ethan@example.com",
    });
  });

  it("normalizes bare ssh target input", () => {
    expect(normalizeSshTarget("ethan@example.com")).toEqual({
      kind: "target",
      value: "ethan@example.com",
    });
  });

  it("shell-escapes ssh targets to prevent command injection", () => {
    expect(shellEscape("example.com; open -a Calculator")).toBe(
      "'example.com; open -a Calculator'",
    );
    expect(shellEscape("ethan' OR '1'='1")).toBe(
      "'ethan'\\'' OR '\\''1'\\''='\\''1'",
    );
  });
});
