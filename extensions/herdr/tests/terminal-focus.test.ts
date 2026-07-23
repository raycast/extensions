import { describe, expect, it } from "vitest";
import {
  buildGhosttyFocusScript,
  buildITermFocusScript,
  buildTerminalFocusScript,
  parseHerdrClientTtys,
  selectWezTermPane,
  selectWezTermWindow,
} from "../src/lib/terminal-focus";

describe("parseHerdrClientTtys", () => {
  const processes = `
??       /opt/herdr /opt/herdr server
ttys001  herdr     herdr
ttys002  herdr     herdr --session work
ttys003  herdr     herdr session attach review
ttys004  zsh       zsh
`;

  it("finds only default-session Herdr clients", () => {
    expect(parseHerdrClientTtys(processes, "/opt/herdr", "default")).toEqual(["/dev/ttys001"]);
  });

  it("finds the requested named session", () => {
    expect(parseHerdrClientTtys(processes, "/opt/herdr", "work")).toEqual(["/dev/ttys002"]);
    expect(parseHerdrClientTtys(processes, "/opt/herdr", "review")).toEqual(["/dev/ttys003"]);
  });
});

describe("terminal focus adapters", () => {
  it("embeds exact TTYs in Terminal and iTerm scripts", () => {
    expect(buildTerminalFocusScript(["/dev/ttys001"])).toContain('targetTtys to {"/dev/ttys001"}');
    expect(buildITermFocusScript(["/dev/ttys001", "/dev/ttys002"])).toContain(
      'whose tty is "/dev/ttys001" or tty is "/dev/ttys002"',
    );
  });

  it("selects the first Ghostty terminal with the exact Herdr title", () => {
    const script = buildGhosttyFocusScript();
    expect(script).toContain('if (name of t as text) is "herdr"');
    expect(script).not.toContain("id of t");
  });

  it("selects the first WezTerm pane with an exact Herdr TTY", () => {
    const panes = JSON.stringify([
      { window_id: 4, pane_id: 1, tty_name: "/dev/ttys001" },
      { window_id: 5, pane_id: 2, tty_name: "/dev/ttys002" },
    ]);
    expect(selectWezTermPane(panes, ["/dev/ttys002"])).toBe("2");
    expect(selectWezTermWindow(panes)).toBe("4");
    expect(selectWezTermPane("not json", ["/dev/ttys002"])).toBeUndefined();
    expect(selectWezTermWindow("not json")).toBeUndefined();
  });
});
