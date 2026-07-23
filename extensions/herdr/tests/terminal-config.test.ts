import { describe, expect, it } from "vitest";
import { detectTerminalKind, expandCustomLauncher } from "../src/lib/terminal-config";

describe("detectTerminalKind", () => {
  it.each([
    ["com.apple.Terminal", "terminal"],
    ["com.googlecode.iterm2", "iterm"],
    ["com.mitchellh.ghostty", "ghostty"],
    ["com.github.wez.wezterm", "wezterm"],
    ["net.kovidgoyal.kitty", "kitty"],
    ["org.alacritty", "alacritty"],
    ["dev.warp.Warp-Stable", "warp"],
  ])("maps %s to %s", (bundleId, kind) => {
    expect(detectTerminalKind({ bundleId, name: "", path: "" })).toBe(kind);
  });

  it("falls back to a generic terminal", () => {
    expect(
      detectTerminalKind({ bundleId: "dev.example.Term", name: "Example", path: "/Applications/Example.app" }),
    ).toBe("generic");
  });
});

describe("expandCustomLauncher", () => {
  it("expands the binary and arguments without passing through a shell", () => {
    expect(
      expandCustomLauncher(`"/Applications/My Term.app/launcher" -e {herdr} {args}`, "/opt/herdr", [
        "--session",
        "work",
      ]),
    ).toEqual(["/Applications/My Term.app/launcher", ["-e", "/opt/herdr", "--session", "work"]]);
  });

  it("supports launchers that accept one command string", () => {
    expect(
      expandCustomLauncher("launcher --command {command}", "/path with space/herdr", [
        "agent",
        "attach",
        "reviewer",
      ]),
    ).toEqual(["launcher", ["--command", "'/path with space/herdr' 'agent' 'attach' 'reviewer'"]]);
  });

  it("requires a command placeholder", () => {
    expect(() => expandCustomLauncher("terminal -e", "/herdr", [])).toThrow("must contain");
  });
});
