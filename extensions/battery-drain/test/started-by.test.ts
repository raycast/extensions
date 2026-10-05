import { describe, expect, it } from "vitest";
import { startedBy } from "../src/analysis/started-by";
import { ProcessInfo } from "../src/types";

const p = (ppid: number, command: string, user = "me"): ProcessInfo => ({
  etimeSec: 10,
  cpuTimeSec: 0,
  user,
  ppid,
  command,
});

describe("startedBy", () => {
  it("skips shells to name the app that really started the process", () => {
    // caffeinate ← zsh ← claude, as observed on 2026-09-23
    const info = new Map([
      [96416, p(96413, "caffeinate")],
      [96413, p(61902, "zsh")],
      [61902, p(4620, "claude")],
    ]);
    expect(startedBy(96416, info)).toEqual({ pid: 61902, command: "claude", via: "zsh" });
  });

  it("names a direct parent that is not a shell", () => {
    const info = new Map([
      [5, p(40, "caffeinate")],
      [40, p(1, "Amphetamine")],
    ]);
    expect(startedBy(5, info)).toEqual({ pid: 40, command: "Amphetamine", via: undefined });
  });

  it("is undefined for processes launched by launchd", () => {
    const info = new Map([[5, p(1, "caffeinate")]]);
    expect(startedBy(5, info)).toBeUndefined();
  });

  describe("started from a terminal", () => {
    it("stops at the terminal instead of naming it as the starter", () => {
      // caffeinate typed in iTerm2, as observed on 2026-09-23: caffeinate ← zsh ← login ← iTermServer-3.7.3
      const info = new Map([
        [59003, p(58555, "caffeinate")],
        [58555, p(58554, "zsh")],
        [58554, p(54084, "login")],
        [54084, p(1, "iTermServer-3.7.3")],
      ]);
      expect(startedBy(59003, info)).toEqual({ pid: 54084, command: "iTerm", via: "zsh", terminal: true });
    });

    it("recognises Terminal, tmux and ssh sessions too", () => {
      for (const host of ["Terminal", "tmux", "sshd-session", "ghostty"]) {
        const info = new Map([
          [5, p(6, "caffeinate")],
          [6, p(7, "zsh")],
          [7, p(1, host)],
        ]);
        expect(startedBy(5, info)?.terminal).toBe(true);
      }
    });

    it("still names a command-line tool that runs inside the terminal", () => {
      // caffeinate ← zsh ← claude ← zsh ← login ← iTermServer: claude started it, not the terminal.
      const info = new Map([
        [5, p(6, "caffeinate")],
        [6, p(7, "zsh")],
        [7, p(8, "claude")],
        [8, p(9, "zsh")],
        [9, p(1, "iTermServer-3.7.3")],
      ]);
      expect(startedBy(5, info)).toEqual({ pid: 7, command: "claude", via: "zsh" });
    });
  });

  it("falls back to the shell when the chain above it is unknown", () => {
    const info = new Map([
      [5, p(6, "caffeinate")],
      [6, p(777, "zsh")],
    ]);
    expect(startedBy(5, info)).toEqual({ pid: 6, command: "zsh", via: undefined });
  });
});
