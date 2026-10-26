import { describe, expect, it } from "vitest";
import {
  activeRowId,
  previewMarkdown,
  abbreviateHome,
  expandHome,
  agentStatus,
  buildCaptureArgs,
  buildFocusPaneArgs,
  buildListArgs,
  buildPaneLinkArgs,
  buildSections,
  buildSendTextArgs,
  cleanCapture,
  sidebarToggles,
  pushRecent,
  withRecent,
  menuLabel,
  fenceText,
  mostUrgentState,
  parseOttyJson,
  paneTitle,
  type OttyPane,
  type OttyTab,
  type OttyWindow,
  type Section,
} from "./workspace";

const HOME = "/Users/alex";

const windows: OttyWindow[] = [
  {
    id: "w_B",
    index: 1,
    title: "second",
    focused: false,
    tab_count: 1,
    pane_count: 1,
  },
  {
    id: "w_A",
    index: 0,
    title: "first",
    focused: true,
    tab_count: 2,
    pane_count: 3,
  },
];

const tabs: OttyTab[] = [
  {
    id: "t_2",
    window_id: "w_A",
    index: 1,
    title: "api",
    cwd: "/Users/alex/code/api",
    process: "api",
    active: true,
    pane_count: 2,
  },
  {
    id: "t_1",
    window_id: "w_A",
    index: 0,
    title: "web",
    cwd: "/Users/alex/code/web",
    process: "web",
    active: false,
    pane_count: 1,
  },
  {
    id: "t_3",
    window_id: "w_B",
    index: 0,
    title: "notes",
    cwd: "/tmp",
    process: "notes",
    active: true,
    pane_count: 1,
  },
];

function pane(overrides: Partial<OttyPane>): OttyPane {
  return {
    id: "p_x",
    tab_id: "t_1",
    window_id: "w_A",
    index: 0,
    active: true,
    cwd: "/Users/alex/code/web",
    process: "web",
    agent: "",
    agent_session_id: "",
    agent_state: "",
    cols: 80,
    rows: 24,
    ...overrides,
  };
}

const panes: OttyPane[] = [
  pane({
    id: "p_api_shell",
    tab_id: "t_2",
    index: 1,
    active: false,
    cwd: "/Users/alex/code/api",
    process: "alex@macbook:~/code/api",
  }),
  pane({
    id: "p_api_agent",
    tab_id: "t_2",
    index: 0,
    cwd: "/Users/alex/code/api",
    process: "api",
    agent: "Claude Code",
    agent_session_id: "abc",
    agent_state: "awaiting",
  }),
  pane({ id: "p_web", tab_id: "t_1", process: "npm run dev" }),
  pane({
    id: "p_notes",
    tab_id: "t_3",
    window_id: "w_B",
    cwd: "/tmp",
    process: "alex@macbook:/tmp",
  }),
];

describe("workspace CLI args", () => {
  it("lists windows, tabs, and panes as JSON", () => {
    expect(buildListArgs("window")).toEqual(["window", "list", "--json"]);
    expect(buildListArgs("tab")).toEqual(["tab", "list", "--json"]);
    expect(buildListArgs("pane")).toEqual(["pane", "list", "--json"]);
  });

  it("focuses a pane by id", () => {
    expect(buildFocusPaneArgs("p_1")).toEqual(["pane", "focus", "p_1"]);
  });

  it("asks Otty for a pane's deeplink", () => {
    expect(buildPaneLinkArgs("p_1")).toEqual(["pane", "link", "--pane", "p_1"]);
  });

  it("captures the last lines of a pane, trimmed", () => {
    expect(buildCaptureArgs("p_1", 30)).toEqual(["pane", "capture", "--pane", "p_1", "--lines", "30", "--trim"]);
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

describe("parseOttyJson", () => {
  it("returns the data field of a successful envelope", () => {
    expect(parseOttyJson<number[]>('{"command":"tab list","data":[1,2],"ok":true}')).toEqual([1, 2]);
  });

  it("throws when Otty reports a failure", () => {
    expect(() => parseOttyJson('{"command":"tab list","error":"boom","ok":false}')).toThrow("boom");
  });

  it("throws a readable error on non-JSON output", () => {
    expect(() => parseOttyJson("not json")).toThrow(/unexpected output/i);
  });
});

describe("abbreviateHome", () => {
  it("replaces the home directory with a tilde", () => {
    expect(abbreviateHome("/Users/alex/code/web", HOME)).toBe("~/code/web");
    expect(abbreviateHome("/Users/alex", HOME)).toBe("~");
  });

  it("leaves other paths and lookalike prefixes alone", () => {
    expect(abbreviateHome("/tmp", HOME)).toBe("/tmp");
    expect(abbreviateHome("/Users/alexander/x", HOME)).toBe("/Users/alexander/x");
  });
});

describe("paneTitle", () => {
  it("uses the agent's reported title for an agent pane", () => {
    expect(paneTitle(panes[1], tabs[0])).toBe("api");
  });

  it("titles an idle shell prompt as Shell", () => {
    expect(paneTitle(panes[0], tabs[0])).toBe("Shell");
    expect(paneTitle(pane({ process: "alex@macbook:/tmp" }), tabs[2])).toBe("Shell");
  });

  it("drops a leading cd from a running command", () => {
    expect(paneTitle(pane({ process: 'cd "/Users/alex/my app" && npm run dev' }), tabs[1])).toBe("npm run dev");
    expect(paneTitle(pane({ process: "cd /tmp && make" }), tabs[1])).toBe("make");
  });

  it("keeps a running command as the title", () => {
    expect(paneTitle(panes[2], tabs[1])).toBe("npm run dev");
  });

  it("falls back to the tab title when the process is empty", () => {
    expect(paneTitle(pane({ process: "" }), tabs[1])).toBe("web");
  });

  it("falls back to a generic title when the tab is unknown", () => {
    expect(paneTitle(pane({ process: "" }), undefined)).toBe("Shell");
  });
});

describe("agentStatus", () => {
  it("labels each agent state", () => {
    expect(agentStatus("awaiting")).toEqual({
      label: "Needs Input",
      tone: "orange",
    });
    expect(agentStatus("processing")).toEqual({
      label: "Working",
      tone: "blue",
    });
    expect(agentStatus("idle")).toEqual({ label: "Idle", tone: "default" });
    expect(agentStatus("unknown")).toEqual({
      label: "Starting",
      tone: "secondary",
    });
  });

  it("returns undefined when no agent is present", () => {
    expect(agentStatus("")).toBeUndefined();
  });
});

describe("mostUrgentState", () => {
  it("ranks awaiting over working over starting over idle", () => {
    expect(mostUrgentState(["idle", "processing", "awaiting"])).toBe("awaiting");
    expect(mostUrgentState(["idle", "unknown", "processing"])).toBe("processing");
    expect(mostUrgentState(["", "idle", "unknown"])).toBe("unknown");
    expect(mostUrgentState(["", "idle"])).toBe("idle");
    expect(mostUrgentState(["", ""])).toBe("");
  });
});

describe("fenceText", () => {
  it("wraps text in a text-tagged code fence", () => {
    expect(fenceText("hello")).toBe("```text\nhello\n```");
  });

  it("uses a fence longer than any backtick run inside the text", () => {
    expect(fenceText("a ```` b")).toBe("`````text\na ```` b\n`````");
  });
});

describe("buildSections: panes", () => {
  const sections = buildSections("panes", windows, tabs, panes, HOME);

  it("groups by window, ordered by window index", () => {
    expect(sections.map((s) => s.title)).toEqual(["first", "second"]);
    expect(sections[0].subtitle).toBe("3 panes");
  });

  it("orders panes by tab index, then pane index", () => {
    expect(sections[0].rows.map((r) => r.id)).toEqual(["p_web", "p_api_agent", "p_api_shell"]);
  });

  it("numbers panes only inside multi-pane tabs", () => {
    const [web, agent, shell] = sections[0].rows;
    expect(web.label).toBeUndefined();
    expect(agent.label).toBe("1 of 2");
    expect(agent.labelTooltip).toBe("Pane 1 of 2");
    expect(shell.label).toBe("2 of 2");
  });

  it("shows the abbreviated cwd as subtitle unless it repeats the title", () => {
    const [web, agent, shell] = sections[0].rows;
    expect(web.subtitle).toBe("~/code/web");
    expect(agent.subtitle).toBe("~/code/api");
    expect(shell.subtitle).toBe("~/code/api");
    expect(sections[1].rows[0].subtitle).toBe("/tmp");
  });

  it("focuses, previews, and messages the pane itself", () => {
    const agent = sections[0].rows[1];
    expect(agent.focusArgs).toEqual(["pane", "focus", "p_api_agent"]);
    expect(agent.paneId).toBe("p_api_agent");
    expect(agent.agentState).toBe("awaiting");
    expect(agent.agent).toBe("Claude Code");
    expect(agent.cwd).toBe("/Users/alex/code/api");
  });

  it("searches the folder name, not the full path", () => {
    const keywords = sections[0].rows[1].keywords;
    expect(keywords).toEqual(expect.arrayContaining(["api", "Claude Code"]));
    expect(keywords).not.toContain("/Users/alex/code/api");
  });

  it("never searches a shell prompt's full path", () => {
    const shell = sections[0].rows[2];
    expect(shell.keywords.join(" ")).not.toMatch(/code\/api/);
  });

  it("keeps a pane whose window or tab closed mid-read", () => {
    const orphan = pane({
      id: "p_orphan",
      tab_id: "t_gone",
      window_id: "w_gone",
    });
    const result = buildSections("panes", windows, tabs, [orphan], HOME);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Window");
    expect(result[0].rows[0].id).toBe("p_orphan");
  });

  it("omits windows with no panes", () => {
    const result = buildSections("panes", windows, tabs, [panes[3]], HOME);
    expect(result.map((s) => s.title)).toEqual(["second"]);
  });
});

describe("buildSections: tabs", () => {
  const sections = buildSections("tabs", windows, tabs, panes, HOME);

  it("groups tabs by window in tab order", () => {
    expect(sections.map((s) => s.title)).toEqual(["first", "second"]);
    expect(sections[0].subtitle).toBe("2 tabs");
    expect(sections[0].rows.map((r) => r.id)).toEqual(["t_1", "t_2"]);
  });

  it("titles a tab by its own title and cwd", () => {
    const api = sections[0].rows[1];
    expect(api.title).toBe("api");
    expect(api.subtitle).toBe("~/code/api");
    expect(api.label).toBe("(2)");
    expect(api.labelTooltip).toBe("2 panes");
    expect(sections[0].rows[0].label).toBeUndefined();
  });

  it("rolls up the most urgent agent state across the tab's panes", () => {
    const api = sections[0].rows[1];
    expect(api.agentState).toBe("awaiting");
    expect(api.agent).toBe("Claude Code");
  });

  it("focuses the tab and previews its active pane", () => {
    const api = sections[0].rows[1];
    expect(api.focusArgs).toEqual(["tab", "focus", "t_2"]);
    expect(api.paneId).toBe("p_api_agent");
  });
});

describe("buildSections: windows", () => {
  const sections = buildSections("windows", windows, tabs, panes, HOME);

  it("lists every window in one untitled section", () => {
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeUndefined();
    expect(sections[0].rows.map((r) => r.id)).toEqual(["w_A", "w_B"]);
  });

  it("summarizes tabs and panes and rolls up agent state", () => {
    const first = sections[0].rows[0];
    expect(first.title).toBe("first");
    expect(first.subtitle).toBe("2 tabs · 3 panes");
    expect(first.agentState).toBe("awaiting");
    expect(first.focusArgs).toEqual(["window", "focus", "w_A"]);
  });

  it("previews the active pane of the active tab", () => {
    expect(sections[0].rows[0].paneId).toBe("p_api_agent");
    expect(sections[0].rows[1].subtitle).toBe("1 tab · 1 pane");
  });
});

describe("cleanCapture", () => {
  it("drops rule-only lines, prompt filler, and extra blank lines", () => {
    const raw = [
      "",
      "──── >_* Restored at 10/19 10:54 ────────────────",
      "",
      "",
      "",
      "~/code/api on main ·································",
      "________________________________________",
      "❯ npm test   ",
      "",
      "",
    ].join("\n");
    expect(cleanCapture(raw)).toBe(
      ["── >_* Restored at 10/19 10:54 ──", "", "~/code/api on main", "❯ npm test"].join("\n"),
    );
  });

  it("drops a short rule left over from a pane divider", () => {
    expect(cleanCapture("❯\n──\n  status")).toBe("❯\n  status");
  });

  it("keeps ordinary text untouched", () => {
    expect(cleanCapture("a - b\n  indented")).toBe("a - b\n  indented");
  });
});

describe("menuLabel", () => {
  const row = (title: string, cwd?: string) =>
    ({
      id: "p",
      title,
      agent: "Claude Code",
      agentState: "idle",
      focusArgs: [],
      cwd,
      keywords: [],
    }) as const;

  it("shows the folder name only when it adds information", () => {
    expect(menuLabel(row("raycast-otty", "/Users/alex/raycast-otty"))).toEqual({
      title: "raycast-otty",
      subtitle: undefined,
    });
    expect(menuLabel(row("Fix the menu", "/Users/alex/raycast-otty"))).toEqual({
      title: "Fix the menu",
      subtitle: "raycast-otty",
    });
  });

  it("shortens long session names with an ellipsis", () => {
    const label = menuLabel(row("x".repeat(60)));
    expect(label.title).toBe(`${"x".repeat(39)}…`);
    expect(label.subtitle).toBeUndefined();
  });
});

describe("sidebarToggles", () => {
  it("offers hiding either part while both show", () => {
    expect(sidebarToggles({ preview: true, details: true })).toEqual({
      preview: true,
      details: true,
      canTogglePreview: true,
      canToggleDetails: true,
    });
  });

  it("only offers bringing back the hidden part", () => {
    expect(sidebarToggles({ preview: false, details: true })).toEqual({
      preview: false,
      details: true,
      canTogglePreview: true,
      canToggleDetails: false,
    });
    expect(sidebarToggles({ preview: true, details: false })).toEqual({
      preview: true,
      details: false,
      canTogglePreview: false,
      canToggleDetails: true,
    });
  });

  it("recovers from a stored state with both hidden", () => {
    expect(sidebarToggles({ preview: false, details: false })).toEqual({
      preview: true,
      details: false,
      canTogglePreview: false,
      canToggleDetails: true,
    });
  });
});

describe("expandHome", () => {
  it("expands a leading tilde and trims", () => {
    expect(expandHome(" ~/code ", "/Users/alex")).toBe("/Users/alex/code");
    expect(expandHome("~", "/Users/alex")).toBe("/Users/alex");
  });

  it("leaves other paths alone and passes empty through", () => {
    expect(expandHome("/tmp/~x", "/Users/alex")).toBe("/tmp/~x");
    expect(expandHome("~alex/x", "/Users/alex")).toBe("~alex/x");
    expect(expandHome(undefined, "/Users/alex")).toBeUndefined();
    expect(expandHome("  ", "/Users/alex")).toBeUndefined();
  });
});

describe("buildSections: rollup attribution", () => {
  it("names the agent whose state is the one shown", () => {
    const mixed = [
      pane({
        id: "p1",
        tab_id: "t_1",
        index: 0,
        agent: "Codex",
        agent_state: "idle",
      }),
      pane({
        id: "p2",
        tab_id: "t_1",
        index: 1,
        agent: "Claude Code",
        agent_state: "awaiting",
      }),
    ];
    const [section] = buildSections("tabs", windows, tabs, mixed, HOME);
    const web = section.rows.find((row) => row.id === "t_1");
    expect(web?.agentState).toBe("awaiting");
    expect(web?.agent).toBe("Claude Code");
  });
});

describe("withRecent", () => {
  const sections = buildSections("tabs", windows, tabs, panes, HOME);

  it("puts recently visited rows first, newest first, without repeating them", () => {
    const result = withRecent(sections, ["t_3", "t_gone", "t_2"]);
    expect(result[0]).toMatchObject({ id: "recent", title: "Recent" });
    expect(result[0].rows.map((r) => r.id)).toEqual(["t_3", "t_2"]);
    expect(result.slice(1).flatMap((s) => s.rows.map((r) => r.id))).toEqual(["t_1"]);
  });

  it("drops a window section that recent rows emptied", () => {
    const result = withRecent(sections, ["t_3"]);
    expect(result.map((s) => s.title)).toEqual(["Recent", "first"]);
  });

  it("caps the Recent section", () => {
    expect(withRecent(sections, ["t_1", "t_2", "t_3"], 2)[0].rows).toHaveLength(2);
  });

  it("leaves the list alone with no matching history", () => {
    expect(withRecent(sections, ["nope"])).toBe(sections);
  });
});

describe("pushRecent", () => {
  it("moves a visit to the front, deduped and capped", () => {
    expect(pushRecent(["a", "b", "c"], "b", 3)).toEqual(["b", "a", "c"]);
    expect(pushRecent(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
  });
});

describe("previewMarkdown", () => {
  it("shows the error when nothing was captured yet", () => {
    expect(previewMarkdown({ paneId: "p_1", error: new Error("pane gone") })).toBe("# Error\n\npane gone");
  });

  it("keeps the last capture but says refreshing stopped", () => {
    expect(previewMarkdown({ paneId: "p_1", data: "hello", error: new Error("pane gone") })).toBe(
      "**Preview stopped refreshing:** pane gone\n\n```text\nhello\n```",
    );
  });

  it("renders a live capture without a notice", () => {
    expect(previewMarkdown({ paneId: "p_1", data: "hello" })).toBe("```text\nhello\n```");
    expect(previewMarkdown({ paneId: "p_1", data: "" })).toBe("*Pane is empty.*");
    expect(previewMarkdown({ paneId: "p_1" })).toBe("");
    expect(previewMarkdown({})).toBe("No pane to preview.");
  });
});

describe("activeRowId", () => {
  const sections = [{ id: "w_1", rows: [{ id: "t_1" }, { id: "t_2" }] }] as Section[];

  it("falls back to the first row until Raycast reports a selection", () => {
    expect(activeRowId(sections, undefined)).toBe("t_1");
  });

  it("follows the reported selection", () => {
    expect(activeRowId(sections, "t_2")).toBe("t_2");
  });

  it("selects nothing when a search filtered every row out", () => {
    expect(activeRowId(sections, null)).toBeUndefined();
  });
});
