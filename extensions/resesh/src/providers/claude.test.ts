import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { MessageCollector } from "../utils";
import type { SessionInfo } from "../types";

// ---------------------------------------------------------------------------
// Fixtures setup — create temp dir BEFORE mocks are evaluated
// ---------------------------------------------------------------------------

const fixturesDir = join(__dirname, "..", "__fixtures__", "claude");

// Create temp home dir synchronously at module level so vi.mock can use it
const tmpHome = mkdtempSync(join(tmpdir(), "resesh-claude-test-"));
const projectsDir = join(tmpHome, ".claude", "projects");

// Create project-a
const projA = join(projectsDir, "project-a");
mkdirSync(projA, { recursive: true });
copyFileSync(join(fixturesDir, "project-a", "session-001.jsonl"), join(projA, "session-001.jsonl"));
copyFileSync(join(fixturesDir, "project-a", "session-002.jsonl"), join(projA, "session-002.jsonl"));
copyFileSync(join(fixturesDir, "project-a", "session-003.jsonl"), join(projA, "session-003.jsonl"));

// Create project-b
const projB = join(projectsDir, "project-b");
mkdirSync(projB, { recursive: true });
copyFileSync(join(fixturesDir, "project-b", "session-004.jsonl"), join(projB, "session-004.jsonl"));

afterAll(() => {
  rmSync(tmpHome, { recursive: true, force: true });
});

// Mock homedir so provider reads from our temp directory
vi.mock("os", async (importOriginal) => {
  const original = await importOriginal<typeof import("os")>();
  return { ...original, homedir: () => tmpHome };
});

// Mock wsl functions to disable WSL scanning
vi.mock("./wsl", async (importOriginal) => {
  const original = await importOriginal<typeof import("./wsl")>();
  return { ...original, wslEnabled: () => false };
});

// Import after mocks are set up
const { claudeProvider, isRealUserPrompt, isUserMessage, getFirstTextBlock, processRecord, buildResult } =
  await import("./claude");

// ---------------------------------------------------------------------------
// isRealUserPrompt
// ---------------------------------------------------------------------------

describe("isRealUserPrompt", () => {
  it("returns true for regular text", () => {
    expect(isRealUserPrompt("Help me fix a bug")).toBe(true);
  });

  it("returns false for <command-name> prefix", () => {
    expect(isRealUserPrompt("<command-name>test</command-name>")).toBe(false);
  });

  it("returns false for <command-message> prefix", () => {
    expect(isRealUserPrompt("<command-message>Running...</command-message>")).toBe(false);
  });

  it("returns false for <local-command prefix", () => {
    expect(isRealUserPrompt("<local-command-output>done</local-command-output>")).toBe(false);
  });

  it("returns false for <task-notification prefix", () => {
    expect(isRealUserPrompt("<task-notification>Task done</task-notification>")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isUserMessage
// ---------------------------------------------------------------------------

describe("isUserMessage", () => {
  it("returns true for valid user record", () => {
    expect(isUserMessage({ type: "user", message: { content: "Hello" } })).toBe(true);
  });

  it("returns false when isMeta is true", () => {
    expect(isUserMessage({ type: "user", message: { content: "Hello" }, isMeta: true })).toBe(false);
  });

  it("returns false for command-prefix content", () => {
    expect(isUserMessage({ type: "user", message: { content: "<command-name>foo</command-name>" } })).toBe(false);
  });

  it("returns false for non-user type", () => {
    expect(isUserMessage({ type: "assistant", message: { content: "Hello" } })).toBe(false);
  });

  it("returns false when content is not a string", () => {
    expect(isUserMessage({ type: "user", message: { content: [{ type: "text", text: "Hi" }] } })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getFirstTextBlock
// ---------------------------------------------------------------------------

describe("getFirstTextBlock", () => {
  it("extracts text from a text block", () => {
    expect(getFirstTextBlock([{ type: "text", text: "Hello world" }])).toBe("Hello world");
  });

  it("returns first text block when multiple blocks present", () => {
    const blocks = [
      { type: "tool_use", id: "123" },
      { type: "text", text: "Second block" },
    ];
    expect(getFirstTextBlock(blocks)).toBe("Second block");
  });

  it("returns null for empty array", () => {
    expect(getFirstTextBlock([])).toBeNull();
  });

  it("returns null when no text blocks", () => {
    expect(getFirstTextBlock([{ type: "tool_use", id: "123" }])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// processRecord
// ---------------------------------------------------------------------------

describe("processRecord", () => {
  function freshState() {
    return { cwd: null as string | null, customTitle: null as string | null, gitBranch: null as string | null };
  }

  function freshCollector(): MessageCollector {
    return { firstUserPrompt: null, matchCount: 0, matches: [], preview: [] };
  }

  it("sets state.cwd from record cwd field", () => {
    const state = freshState();
    processRecord({ cwd: "/home/user/project" }, state, freshCollector(), null, null);
    expect(state.cwd).toBe("/home/user/project");
  });

  it("does not overwrite state.cwd once set", () => {
    const state = freshState();
    state.cwd = "/already/set";
    processRecord({ cwd: "/other/path" }, state, freshCollector(), null, null);
    expect(state.cwd).toBe("/already/set");
  });

  it("sets state.gitBranch from record", () => {
    const state = freshState();
    processRecord({ gitBranch: "main" }, state, freshCollector(), null, null);
    expect(state.gitBranch).toBe("main");
  });

  it("sets state.customTitle from custom-title record", () => {
    const state = freshState();
    processRecord({ type: "custom-title", customTitle: "My Title" }, state, freshCollector(), null, null);
    expect(state.customTitle).toBe("My Title");
  });

  it("processes valid user message into collector", () => {
    const collector = freshCollector();
    processRecord(
      { type: "user", message: { content: "Hello" }, timestamp: "2025-01-15T10:00:00Z" },
      freshState(),
      collector,
      null,
      null,
    );
    expect(collector.firstUserPrompt).toBe("Hello");
    expect(collector.preview.length).toBe(1);
  });

  it("processes assistant message with text block", () => {
    const collector = freshCollector();
    processRecord(
      {
        type: "assistant",
        message: { content: [{ type: "text", text: "I can help" }] },
        timestamp: "2025-01-15T10:00:00Z",
      },
      freshState(),
      collector,
      null,
      null,
    );
    expect(collector.preview.length).toBe(1);
    expect(collector.preview[0].source).toBe("assistant");
  });

  it("skips isMeta user messages", () => {
    const collector = freshCollector();
    processRecord({ type: "user", message: { content: "Meta" }, isMeta: true }, freshState(), collector, null, null);
    expect(collector.preview.length).toBe(0);
  });

  it("tracks matches when query matches", () => {
    const collector = freshCollector();
    processRecord(
      { type: "user", message: { content: "fix the error" }, timestamp: "2025-01-15T10:00:00Z" },
      freshState(),
      collector,
      "error",
      "error",
    );
    expect(collector.matchCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// buildResult
// ---------------------------------------------------------------------------

describe("buildResult", () => {
  it("returns null when state.cwd is null", () => {
    const state = { cwd: null, customTitle: null, gitBranch: null };
    const collector: MessageCollector = { firstUserPrompt: null, matchCount: 0, matches: [], preview: [] };
    expect(buildResult(state, collector, "sess-1", "proj-a", 1000)).toBeNull();
  });

  it("returns SessionSearchResult with correct fields", () => {
    const state = { cwd: "/home/user/project", customTitle: "Title", gitBranch: "main" };
    const collector: MessageCollector = {
      firstUserPrompt: "Hello",
      matchCount: 1,
      matches: [{ text: "Hello", source: "user" as const, timestamp: null }],
      preview: [{ text: "Hello", source: "user" as const, timestamp: null }],
    };
    const result = buildResult(state, collector, "sess-1", "proj-a", 1000);
    expect(result).not.toBeNull();
    expect(result!.session.sessionId).toBe("sess-1");
    expect(result!.session.projectDir).toBe("proj-a");
    expect(result!.session.projectPath).toBe("/home/user/project");
    expect(result!.session.customTitle).toBe("Title");
    expect(result!.session.gitBranch).toBe("main");
    expect(result!.session.lastModified).toBe(1000);
    expect(result!.matchCount).toBe(1);
  });

  it("includes wslDistro when provided", () => {
    const state = { cwd: "/home/user/project", customTitle: null, gitBranch: null };
    const collector: MessageCollector = { firstUserPrompt: null, matchCount: 0, matches: [], preview: [] };
    const result = buildResult(state, collector, "sess-1", "proj-a", 1000, "Ubuntu");
    expect(result!.session.wslDistro).toBe("Ubuntu");
  });
});

// ---------------------------------------------------------------------------
// resumeCommand
// ---------------------------------------------------------------------------

describe("claudeProvider.resumeCommand", () => {
  it("returns native resume command", () => {
    const session = { sessionId: "abc-123" } as SessionInfo;
    expect(claudeProvider.resumeCommand(session)).toBe("claude --resume abc-123");
  });

  it("returns WSL resume command", () => {
    const session = {
      sessionId: "abc-123",
      projectPath: "/home/user/project",
      wslDistro: "Ubuntu",
    } as SessionInfo;
    expect(claudeProvider.resumeCommand(session)).toBe(
      "wsl -d Ubuntu --cd /home/user/project -- bash -lic 'claude --resume abc-123'",
    );
  });
});

// ---------------------------------------------------------------------------
// discoverProjects (integration)
// ---------------------------------------------------------------------------

describe("claudeProvider.discoverProjects", () => {
  it("discovers projects from fixture directory", async () => {
    const projects = await claudeProvider.discoverProjects();
    expect(projects.length).toBeGreaterThanOrEqual(2);

    const labels = projects.map((p) => p.label);
    expect(labels).toContain("projects/myapp");
    expect(labels).toContain("projects/webapp");
  });

  it("returns sorted results", async () => {
    const projects = await claudeProvider.discoverProjects();
    const labels = projects.map((p) => p.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// searchSessions (integration)
// ---------------------------------------------------------------------------

describe("claudeProvider.searchSessions", () => {
  it("returns all sessions when no query", async () => {
    const results = await claudeProvider.searchSessions("", null);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("returns results sorted by lastModified descending", async () => {
    const results = await claudeProvider.searchSessions("", null);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].session.lastModified).toBeGreaterThanOrEqual(results[i].session.lastModified);
    }
  });

  it("filters by query — only returns sessions with matching content", async () => {
    const results = await claudeProvider.searchSessions("connection refused", null);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((r) => r.matchCount > 0)).toBe(true);
  });

  it("filters by query — no results for non-matching query", async () => {
    const results = await claudeProvider.searchSessions("xyznonexistent123", null);
    expect(results.length).toBe(0);
  });

  it("filters by projectFilter", async () => {
    const results = await claudeProvider.searchSessions("", "project-b");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((r) => r.session.projectDir === "project-b")).toBe(true);
  });

  it("respects AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();
    const results = await claudeProvider.searchSessions("", null, controller.signal);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("extracts customTitle from session-001", async () => {
    const results = await claudeProvider.searchSessions("", "project-a");
    const session001 = results.find((r) => r.session.sessionId === "session-001");
    expect(session001?.session.customTitle).toBe("Debugging connection error");
  });

  it("extracts gitBranch from session-004", async () => {
    const results = await claudeProvider.searchSessions("", "project-b");
    const session004 = results.find((r) => r.session.sessionId === "session-004");
    expect(session004?.session.gitBranch).toBe("feature/ci");
  });

  it("filters isMeta and command-prefix messages from session-002", async () => {
    const results = await claudeProvider.searchSessions("", "project-a");
    const session002 = results.find((r) => r.session.sessionId === "session-002");
    expect(session002?.session.firstUserPrompt).toBe("Now refactor the auth module");
  });

  it("handles malformed lines in session-003", async () => {
    const results = await claudeProvider.searchSessions("", "project-a");
    const session003 = results.find((r) => r.session.sessionId === "session-003");
    expect(session003).toBeDefined();
    expect(session003!.preview.length).toBeGreaterThanOrEqual(2);
  });
});
