import { mkdtempSync, mkdirSync, rmSync, copyFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { MessageCollector } from "../utils";
import type { SessionInfo } from "../types";

// ---------------------------------------------------------------------------
// Fixtures setup — create temp dir BEFORE mocks are evaluated
// ---------------------------------------------------------------------------

const fixturesDir = join(__dirname, "..", "__fixtures__", "codex");

const tmpHome = mkdtempSync(join(tmpdir(), "resesh-codex-test-"));
const sessionsDir = join(tmpHome, ".codex", "sessions", "2025", "01", "15");
mkdirSync(sessionsDir, { recursive: true });
copyFileSync(
  join(fixturesDir, "2025", "01", "15", "rollout-1705312800-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jsonl"),
  join(sessionsDir, "rollout-1705312800-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jsonl"),
);
copyFileSync(
  join(fixturesDir, "2025", "01", "15", "rollout-1705312800-11111111-2222-3333-4444-555555555555.jsonl"),
  join(sessionsDir, "rollout-1705312800-11111111-2222-3333-4444-555555555555.jsonl"),
);

afterAll(() => {
  rmSync(tmpHome, { recursive: true, force: true });
});

vi.mock("os", async (importOriginal) => {
  const original = await importOriginal<typeof import("os")>();
  return { ...original, homedir: () => tmpHome };
});

vi.mock("./wsl", async (importOriginal) => {
  const original = await importOriginal<typeof import("./wsl")>();
  return { ...original, wslEnabled: () => false };
});

const { codexProvider, sessionIdFromFilename, isUserMessage, isAgentMessage, processRecord } = await import("./codex");

// ---------------------------------------------------------------------------
// sessionIdFromFilename
// ---------------------------------------------------------------------------

describe("sessionIdFromFilename", () => {
  it("extracts UUID from standard Codex filename", () => {
    expect(sessionIdFromFilename("rollout-1705312800-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jsonl")).toBe(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
  });

  it("strips .jsonl for non-UUID filenames", () => {
    expect(sessionIdFromFilename("custom-session.jsonl")).toBe("custom-session");
  });
});

// ---------------------------------------------------------------------------
// isUserMessage
// ---------------------------------------------------------------------------

describe("codex isUserMessage", () => {
  it("returns true for valid user_message record", () => {
    expect(isUserMessage({ type: "event_msg", payload: { type: "user_message", message: "Hello" } })).toBe(true);
  });

  it("returns false for agent_message", () => {
    expect(isUserMessage({ type: "event_msg", payload: { type: "agent_message", message: "Hi" } })).toBe(false);
  });

  it("returns false for non-event_msg type", () => {
    expect(isUserMessage({ type: "session_meta", payload: { id: "123" } })).toBe(false);
  });

  it("returns false for missing payload", () => {
    expect(isUserMessage({ type: "event_msg" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAgentMessage
// ---------------------------------------------------------------------------

describe("codex isAgentMessage", () => {
  it("returns true for valid agent_message record", () => {
    expect(isAgentMessage({ type: "event_msg", payload: { type: "agent_message", message: "Hi" } })).toBe(true);
  });

  it("returns false for user_message", () => {
    expect(isAgentMessage({ type: "event_msg", payload: { type: "user_message", message: "Hello" } })).toBe(false);
  });

  it("returns false for non-event_msg type", () => {
    expect(isAgentMessage({ type: "session_meta", payload: {} })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// processRecord
// ---------------------------------------------------------------------------

describe("codex processRecord", () => {
  function freshState() {
    return { cwd: null as string | null, sessionId: null as string | null };
  }

  function freshCollector(): MessageCollector {
    return { firstUserPrompt: null, matchCount: 0, matches: [], preview: [] };
  }

  it("sets state.cwd and state.sessionId from session_meta", () => {
    const state = freshState();
    processRecord(
      { type: "session_meta", payload: { id: "sess-uuid", cwd: "/home/user/proj" } },
      state,
      freshCollector(),
      null,
      null,
    );
    expect(state.cwd).toBe("/home/user/proj");
    expect(state.sessionId).toBe("sess-uuid");
  });

  it("processes user_message into collector", () => {
    const collector = freshCollector();
    processRecord(
      {
        type: "event_msg",
        payload: { type: "user_message", message: "Explain this" },
        timestamp: "2025-01-15T10:00:00Z",
      },
      freshState(),
      collector,
      null,
      null,
    );
    expect(collector.firstUserPrompt).toBe("Explain this");
    expect(collector.preview.length).toBe(1);
    expect(collector.preview[0].source).toBe("user");
  });

  it("processes agent_message into collector", () => {
    const collector = freshCollector();
    processRecord(
      {
        type: "event_msg",
        payload: { type: "agent_message", message: "Here is the answer" },
        timestamp: "2025-01-15T10:00:05Z",
      },
      freshState(),
      collector,
      null,
      null,
    );
    expect(collector.preview.length).toBe(1);
    expect(collector.preview[0].source).toBe("assistant");
  });

  it("tracks matches when query matches", () => {
    const collector = freshCollector();
    processRecord(
      {
        type: "event_msg",
        payload: { type: "user_message", message: "fix the error" },
        timestamp: "2025-01-15T10:00:00Z",
      },
      freshState(),
      collector,
      "error",
      "error",
    );
    expect(collector.matchCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// resumeCommand
// ---------------------------------------------------------------------------

describe("codexProvider.resumeCommand", () => {
  it("returns native resume command", () => {
    const session = { sessionId: "abc-123" } as SessionInfo;
    expect(codexProvider.resumeCommand(session)).toBe("codex resume abc-123");
  });

  it("returns WSL resume command", () => {
    const session = {
      sessionId: "abc-123",
      projectPath: "/home/user/project",
      wslDistro: "Ubuntu",
    } as SessionInfo;
    expect(codexProvider.resumeCommand(session)).toBe(
      "wsl -d Ubuntu --cd /home/user/project -- bash -lic 'codex resume abc-123'",
    );
  });
});

// ---------------------------------------------------------------------------
// discoverProjects (integration)
// ---------------------------------------------------------------------------

describe("codexProvider.discoverProjects", () => {
  it("discovers unique projects from fixture sessions", async () => {
    const projects = await codexProvider.discoverProjects();
    expect(projects.length).toBe(2);

    const labels = projects.map((p) => p.label);
    expect(labels).toContain("projects/myapp");
    expect(labels).toContain("projects/webapp");
  });

  it("returns sorted results", async () => {
    const projects = await codexProvider.discoverProjects();
    const labels = projects.map((p) => p.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// searchSessions (integration)
// ---------------------------------------------------------------------------

describe("codexProvider.searchSessions", () => {
  it("returns all sessions when no query", async () => {
    const results = await codexProvider.searchSessions("", null);
    expect(results.length).toBe(2);
  });

  it("returns results sorted by lastModified descending", async () => {
    const results = await codexProvider.searchSessions("", null);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].session.lastModified).toBeGreaterThanOrEqual(results[i].session.lastModified);
    }
  });

  it("filters by query — only matching sessions", async () => {
    const results = await codexProvider.searchSessions("main function", null);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((r) => r.matchCount > 0)).toBe(true);
  });

  it("filters by query — no results for non-matching query", async () => {
    const results = await codexProvider.searchSessions("xyznonexistent123", null);
    expect(results.length).toBe(0);
  });

  it("filters by projectFilter (cwd)", async () => {
    const results = await codexProvider.searchSessions("", "/home/user/projects/webapp");
    expect(results.length).toBe(1);
    expect(results[0].session.projectPath).toBe("/home/user/projects/webapp");
  });

  it("extracts sessionId from session_meta payload", async () => {
    const results = await codexProvider.searchSessions("", null);
    const ids = results.map((r) => r.session.sessionId);
    expect(ids).toContain("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(ids).toContain("11111111-2222-3333-4444-555555555555");
  });

  it("extracts firstUserPrompt correctly", async () => {
    const results = await codexProvider.searchSessions("", "/home/user/projects/myapp");
    expect(results.length).toBe(1);
    expect(results[0].session.firstUserPrompt).toBe("Explain the main function");
  });

  it("respects AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();
    const results = await codexProvider.searchSessions("", null, controller.signal);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});
