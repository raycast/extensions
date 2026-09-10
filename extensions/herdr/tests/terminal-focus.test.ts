import { describe, expect, it } from "vitest";
import {
  buildGhosttyFocusScript,
  buildITermFocusScript,
  buildITermTtyListScript,
  buildTerminalFocusScript,
  buildTerminalTtyListScript,
  parseHerdrClientTtys,
  parseHerdrClients,
  parseTtyList,
  selectWezTermPane,
  selectWezTermPanes,
  selectWezTermWindow,
} from "../src/lib/terminal-focus";

describe("parseHerdrClientTtys", () => {
  const processes = `
??       /opt/herdr /opt/herdr server
ttys001  herdr     herdr
ttys002  herdr     herdr --session work
ttys003  herdr     herdr session attach review
ttys004  zsh       zsh
ttys005  herdr     herdr --session default
`;

  it("finds bare and explicitly default-session Herdr clients", () => {
    expect(parseHerdrClientTtys(processes, "/opt/herdr", "default")).toEqual(["/dev/ttys001", "/dev/ttys005"]);
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

  it("selects the Ghostty terminal with the session-specific marker title", () => {
    const script = buildGhosttyFocusScript("herdr-raycast-session");
    expect(script).toContain('if (name of t as text) is "herdr-raycast-session"');
    expect(script).not.toContain('is "herdr"');
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

describe("parseHerdrClients", () => {
  // Shapes taken from a real `ps -o pid=,tty=,comm=,args=`: comm is truncated,
  // the server has no tty, and the remote bridge is a bare `herdr client`
  // sharing the tty of its `--remote` parent.
  const processes = `
31029 ??       /opt/herdr       /opt/herdr server
23895 ttys001  herdr            herdr session attach review
51496 ttys017  /opt/herdr       /opt/herdr session attach default
48369 ttys041  herdr            herdr --remote clouddesk --session meshclaw
48678 ttys041  /opt/herdr       /opt/herdr client
60001 ttys005  herdr            herdr
60002 ttys006  herdr            herdr --session=work
`;

  it("returns pid and tty of clients whose argv names the session", () => {
    expect(parseHerdrClients(processes, "/opt/herdr", "review")).toEqual([{ pid: "23895", tty: "/dev/ttys001" }]);
    expect(parseHerdrClients(processes, "/opt/herdr", "work")).toEqual([{ pid: "60002", tty: "/dev/ttys006" }]);
  });

  // Regression guard for the detach path: a bare client or the remote bridge
  // must never read as a Default Session client, so argv alone never qualifies.
  it("excludes bare clients, the remote bridge, and remote attaches", () => {
    expect(parseHerdrClients(processes, "/opt/herdr", "default")).toEqual([{ pid: "51496", tty: "/dev/ttys017" }]);
    expect(parseHerdrClients(processes, "/opt/herdr", "meshclaw")).toEqual([]);
  });
});

describe("selectWezTermPanes", () => {
  const panes = JSON.stringify([
    { window_id: 4, pane_id: 1, tty_name: "/dev/ttys001" },
    { window_id: 5, pane_id: 2, tty_name: "/dev/ttys002" },
    { window_id: 5, pane_id: 3, tty_name: "/dev/ttys003" },
  ]);

  it("keeps only ttys that are WezTerm panes and reports the first match's window", () => {
    expect(selectWezTermPanes(panes, ["/dev/ttys041", "/dev/ttys002", "/dev/ttys003"])).toEqual({
      ttys: ["/dev/ttys002", "/dev/ttys003"],
      windowId: "5",
    });
    expect(selectWezTermPanes(panes, ["/dev/ttys041"])).toEqual({ ttys: [], windowId: undefined });
  });

  it("is unavailable when the listing is not a pane array", () => {
    expect(selectWezTermPanes("not json", ["/dev/ttys001"])).toBeUndefined();
    expect(selectWezTermPanes("9", ["/dev/ttys001"])).toBeUndefined();
  });
});

describe("terminal tty listings", () => {
  it("asks Terminal and iTerm for every tty", () => {
    expect(buildTerminalTtyListScript()).toContain("tty of every tab of every window");
    expect(buildITermTtyListScript()).toContain("tty of every session of every tab of every window");
  });

  it("parses the flattened list osascript prints", () => {
    expect(parseTtyList("/dev/ttys001, /dev/ttys002, /dev/ttys001")).toEqual(["/dev/ttys001", "/dev/ttys002"]);
    expect(parseTtyList("")).toEqual([]);
  });
});
