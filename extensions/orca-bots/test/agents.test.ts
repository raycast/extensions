import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type OpenAgent,
  displayTitle,
  groupBySection,
  parseOpenAgents,
  sectionOf,
  subtitleOf,
} from "../src/lib/agents";

const loadResult = (): { worktrees: { agents: unknown[] }[] } =>
  JSON.parse(readFileSync(join(__dirname, "fixtures", "worktree-ps.json"), "utf8")).result;

const makeAgent = (overrides: Partial<OpenAgent>): OpenAgent => ({
  sessionId: "s",
  terminalHandle: null,
  kind: "terminal",
  state: "working",
  section: "running",
  harness: "claude",
  title: "t",
  subtitle: "repo · main",
  lastPrompt: null,
  lastMessage: null,
  stateSince: null,
  updatedAt: 0,
  repo: "repo",
  workspace: "main",
  bot: null,
  ...overrides,
});

const psWith = (worktree: Record<string, unknown>, agents: Record<string, unknown>[]) => ({
  worktrees: [{ displayName: "main", repo: "repo", bot: null, workspaceKind: "git", ...worktree, agents }],
});

describe("parseOpenAgents", () => {
  test("parses every agent of the real ps output", () => {
    const result = loadResult();
    const expected = result.worktrees.flatMap((worktree) => worktree.agents).length;
    expect(expected).toBeGreaterThan(0);
    expect(parseOpenAgents(result)).toHaveLength(expected);
  });

  test("chats and terminals are told apart", () => {
    const agents = parseOpenAgents(loadResult());

    const chat = agents.find((agent) => agent.workspace === "Reviewer");
    expect(chat?.kind).toBe("chat");
    expect(chat?.terminalHandle).toBeNull();
    expect(chat?.subtitle).toBe("Bot · Reviewer");
    expect(chat?.bot).toBe("Reviewer");
    expect(chat?.harness).toBe("grok");

    const terminal = agents.find((agent) => agent.terminalHandle === "term_2d695e95-b3f4-4528-8534-46ca57575e9c");
    expect(terminal?.kind).toBe("terminal");
    expect(terminal?.subtitle).toBe("orca · main");
    expect(terminal?.bot).toBeNull();
  });

  test("no real title starts with <", () => {
    for (const agent of parseOpenAgents(loadResult())) {
      expect(agent.title.startsWith("<")).toBe(false);
      expect(agent.title.length).toBeGreaterThan(0);
    }
  });

  test("terminal without handle has no switch target", () => {
    const [agent] = parseOpenAgents(
      psWith({}, [{ address: null, agentType: "claude", state: "working", orcaSessionId: "sid-1" }]),
    );
    expect(agent.kind).toBe("terminal");
    expect(agent.terminalHandle).toBeNull();
    expect(agent.sessionId).toBe("sid-1");
    expect(agent.section).toBe("running");
  });

  test("an agent without orcaSessionId falls back on its address", () => {
    const [agent] = parseOpenAgents(psWith({}, [{ address: "term_abc", agentType: "claude", state: "done" }]));
    expect(agent.sessionId).toBe("term_abc");
    expect(agent.terminalHandle).toBe("term_abc");
  });

  test("an agent with neither session id nor address is skipped", () => {
    expect(parseOpenAgents(psWith({}, [{ agentType: "claude", state: "done" }]))).toEqual([]);
  });

  test("a folder-workspace without address is a chat", () => {
    const [agent] = parseOpenAgents(
      psWith({ workspaceKind: "folder-workspace" }, [{ address: null, orcaSessionId: "x", state: "done" }]),
    );
    expect(agent.kind).toBe("chat");
    expect(agent.terminalHandle).toBeNull();
  });

  test("optional fields map to null or zero", () => {
    const [agent] = parseOpenAgents(
      psWith({}, [
        {
          address: "term_1",
          state: "working",
          prompt: "",
          stateStartedAt: 123,
          lastAssistantMessage: "hi",
          updatedAt: 456,
        },
      ]),
    );
    expect(agent.lastPrompt).toBeNull();
    expect(agent.lastMessage).toBe("hi");
    expect(agent.stateSince).toBe(123);
    expect(agent.updatedAt).toBe(456);

    const [bare] = parseOpenAgents(psWith({}, [{ address: "term_2", state: "working" }]));
    expect(bare.lastPrompt).toBeNull();
    expect(bare.lastMessage).toBeNull();
    expect(bare.stateSince).toBeNull();
    expect(bare.updatedAt).toBe(0);
  });

  test("two chats of the same bot get titles drawn from their own prompts", () => {
    const agents = parseOpenAgents(
      psWith({ bot: "test", displayName: "test", workspaceKind: "folder-workspace" }, [
        { orcaSessionId: "a", conversationName: "test", prompt: "Quelle heure ?", state: "done" },
        { orcaSessionId: "b", conversationName: "test", prompt: "Et la météo ?", state: "done" },
      ]),
    );
    expect(agents.map((agent) => agent.title)).toEqual(["Quelle heure ?", "Et la météo ?"]);
  });

  // Orca tronque l'aperçu à 200 caractères : au-delà du seuil, on signale la coupure par « … ».
  test("a last message at the 200 character preview limit is marked as truncated", () => {
    const [short, atLimit] = parseOpenAgents(
      psWith({}, [
        { address: "term_1", state: "done", lastAssistantMessage: "a".repeat(199) },
        { address: "term_2", state: "done", lastAssistantMessage: "b".repeat(200) },
      ]),
    );
    expect(short.lastMessage).toBe("a".repeat(199));
    expect(atLimit.lastMessage).toBe(`${"b".repeat(200)}…`);
  });

  test("a missing state is kept and filed in running", () => {
    const [agent] = parseOpenAgents(psWith({}, [{ address: "term_1" }]));
    expect(agent.section).toBe("running");
  });

  test("tolerates unexpected shapes", () => {
    for (const value of [
      null,
      undefined,
      42,
      "x",
      {},
      { worktrees: null },
      { worktrees: [null, 1, {}, { agents: null }] },
    ]) {
      expect(parseOpenAgents(value)).toEqual([]);
    }
  });
});

describe("displayTitle", () => {
  test("noisy titles fall back", () => {
    expect(displayTitle({ conversationName: "<local-command-caveat>The command below", prompt: "" })).toBe(
      "Untitled Session",
    );
    expect(displayTitle({ conversationName: "<x>", prompt: "Line one\nLine two" })).toBe("Line one");

    const title = displayTitle({ conversationName: null, prompt: "a".repeat(120) });
    expect(title).toHaveLength(81);
    expect(title.endsWith("…")).toBe(true);
  });

  test("follows the candidate order and skips empty ones", () => {
    expect(displayTitle({ conversationName: "Conv", taskTitle: "Task", displayName: "Name" })).toBe("Conv");
    expect(displayTitle({ conversationName: "  ", taskTitle: "Task", displayName: "Name" })).toBe("Task");
    expect(displayTitle({ taskTitle: "<t>", displayName: "Name" })).toBe("Name");
  });

  test("a prompt of exactly 80 characters is not truncated", () => {
    expect(displayTitle({ prompt: "b".repeat(80) })).toBe("b".repeat(80));
  });

  test("a prompt starting with < still falls back", () => {
    expect(displayTitle({ prompt: "<system>x" })).toBe("Untitled Session");
  });

  test("a candidate equal to the bot name is skipped so bot chats stay distinguishable", () => {
    expect(displayTitle({ conversationName: "test", prompt: "Quelle heure ?" }, "test")).toBe("Quelle heure ?");
    expect(displayTitle({ conversationName: " test ", taskTitle: "Task", prompt: "Q" }, "test")).toBe("Task");
    expect(displayTitle({ conversationName: "Other", prompt: "Q" }, "test")).toBe("Other");
    expect(displayTitle({ conversationName: "test", prompt: "Q" }, null)).toBe("test");
  });

  test("a bot chat with only the bot name keeps a title", () => {
    expect(displayTitle({ conversationName: "test", prompt: "" }, "test")).toBe("Untitled Session");
  });
});

describe("sectionOf", () => {
  test("unknown state stays visible in running", () => {
    expect(sectionOf("sleeping")).toBe("running");
    expect(sectionOf("")).toBe("running");
    expect(sectionOf("working")).toBe("running");
    expect(sectionOf("waiting")).toBe("attention");
    expect(sectionOf("blocked")).toBe("attention");
    expect(sectionOf("done")).toBe("done");
  });
});

describe("subtitleOf", () => {
  test("uses the bot name when present, repo and workspace otherwise", () => {
    expect(subtitleOf({ bot: "Researcher", repo: "Bots", displayName: "Researcher" })).toBe("Bot · Researcher");
    expect(subtitleOf({ bot: null, repo: "orca", displayName: "main" })).toBe("orca · main");
    expect(subtitleOf({ repo: "orca", displayName: "main" })).toBe("orca · main");
  });

  test("shows the repo once when repo and workspace share the same name", () => {
    expect(subtitleOf({ bot: null, repo: "orca-raycast-extension", displayName: "orca-raycast-extension" })).toBe(
      "orca-raycast-extension",
    );
  });
});

describe("groupBySection", () => {
  test("groups in fixed order and drops empty sections", () => {
    const groups = groupBySection([
      makeAgent({ sessionId: "d1", section: "done", updatedAt: 10 }),
      makeAgent({ sessionId: "w1", section: "running", updatedAt: 5 }),
      makeAgent({ sessionId: "d2", section: "done", updatedAt: 20 }),
    ]);
    expect(groups.map((group) => group.section)).toEqual(["running", "done"]);
    expect(groups[1].agents.map((agent) => agent.sessionId)).toEqual(["d2", "d1"]);
    expect(groups[1].title).toBe("Done");
  });

  test("puts attention first with its English title and does not mutate its input", () => {
    const input = [
      makeAgent({ sessionId: "r", section: "running" }),
      makeAgent({ sessionId: "a", section: "attention", updatedAt: 1 }),
      makeAgent({ sessionId: "a2", section: "attention", updatedAt: 2 }),
    ];
    const snapshot = input.map((agent) => agent.sessionId);
    const groups = groupBySection(input);
    expect(groups.map((group) => [group.section, group.title])).toEqual([
      ["attention", "Waiting for Reply"],
      ["running", "In Progress"],
    ]);
    expect(groups[0].agents.map((agent) => agent.sessionId)).toEqual(["a2", "a"]);
    expect(input.map((agent) => agent.sessionId)).toEqual(snapshot);
  });

  test("returns no group for no agent", () => {
    expect(groupBySection([])).toEqual([]);
  });
});
