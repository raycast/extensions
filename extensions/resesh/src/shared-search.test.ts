import {
  sessionTitle,
  formatTime,
  groupByProject,
  snippetToMarkdown,
  sessionDetailMarkdown,
  wslDropdownLabel,
} from "./shared-search";
import type { SessionSearchResult, MessageSnippet } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(
  overrides: Partial<SessionSearchResult> & { session?: Partial<SessionSearchResult["session"]> } = {},
): SessionSearchResult {
  const { session: sessionOverrides, ...rest } = overrides;
  return {
    session: {
      sessionId: "abc12345-6789-0000-0000-000000000000",
      projectDir: "/home/user/projects/myapp",
      projectPath: "/home/user/projects/myapp",
      projectLabel: "projects/myapp",
      customTitle: null,
      firstUserPrompt: null,
      lastModified: 1705312800000,
      gitBranch: null,
      ...sessionOverrides,
    },
    matchCount: 0,
    matches: [],
    preview: [],
    ...rest,
  };
}

function makeSnippet(overrides: Partial<MessageSnippet> = {}): MessageSnippet {
  return {
    text: "Some message text",
    source: "user",
    timestamp: "2025-01-15T10:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// sessionTitle
// ---------------------------------------------------------------------------

describe("sessionTitle", () => {
  it("returns customTitle when present", () => {
    const result = makeResult({ session: { customTitle: "My Session" } });
    expect(sessionTitle(result)).toBe("My Session");
  });

  it("returns firstUserPrompt when no customTitle", () => {
    const result = makeResult({ session: { firstUserPrompt: "Help me fix a bug" } });
    expect(sessionTitle(result)).toBe("Help me fix a bug");
  });

  it("truncates firstUserPrompt longer than 80 chars", () => {
    const longPrompt = "A".repeat(100);
    const result = makeResult({ session: { firstUserPrompt: longPrompt } });
    const title = sessionTitle(result);
    expect(title.length).toBe(83); // 80 + "..."
    expect(title.endsWith("...")).toBe(true);
  });

  it("replaces newlines in firstUserPrompt with spaces", () => {
    const result = makeResult({ session: { firstUserPrompt: "Line one\nLine two" } });
    expect(sessionTitle(result)).toBe("Line one Line two");
  });

  it("returns first 8 chars of sessionId as fallback", () => {
    const result = makeResult();
    expect(sessionTitle(result)).toBe("abc12345");
  });
});

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------

describe("formatTime", () => {
  it("returns empty string for null", () => {
    expect(formatTime(null)).toBe("");
  });

  it("returns a formatted string for valid ISO timestamp", () => {
    const formatted = formatTime("2025-01-15T10:30:00Z");
    expect(formatted.length).toBeGreaterThan(0);
    // Locale-dependent but should contain "Jan" and "15"
    expect(formatted).toMatch(/Jan/i);
  });
});

// ---------------------------------------------------------------------------
// groupByProject
// ---------------------------------------------------------------------------

describe("groupByProject", () => {
  it("groups results by projectDir", () => {
    const r1 = makeResult({ session: { projectDir: "proj-a" } });
    const r2 = makeResult({ session: { projectDir: "proj-b" } });
    const r3 = makeResult({ session: { projectDir: "proj-a" } });

    const groups = groupByProject([r1, r2, r3]);
    expect(groups.size).toBe(2);
    expect(groups.get("proj-a")!.length).toBe(2);
    expect(groups.get("proj-b")!.length).toBe(1);
  });

  it("returns empty map for empty array", () => {
    expect(groupByProject([]).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// snippetToMarkdown
// ---------------------------------------------------------------------------

describe("snippetToMarkdown", () => {
  it("labels user messages as You", () => {
    const md = snippetToMarkdown(makeSnippet({ source: "user" }), "Claude");
    expect(md).toContain("**You**");
  });

  it("labels assistant messages with assistantLabel", () => {
    const md = snippetToMarkdown(makeSnippet({ source: "assistant" }), "Claude");
    expect(md).toContain("**Claude**");
  });

  it("includes formatted time when timestamp present", () => {
    const md = snippetToMarkdown(makeSnippet({ timestamp: "2025-01-15T10:30:00Z" }), "Claude");
    expect(md).toContain("`");
  });

  it("omits time when timestamp is null", () => {
    const md = snippetToMarkdown(makeSnippet({ timestamp: null }), "Claude");
    expect(md).not.toContain("\u00b7");
  });

  it("quotes message text with > prefix", () => {
    const md = snippetToMarkdown(makeSnippet({ text: "Hello" }), "Claude");
    expect(md).toContain("> Hello");
  });
});

// ---------------------------------------------------------------------------
// sessionDetailMarkdown
// ---------------------------------------------------------------------------

describe("sessionDetailMarkdown", () => {
  it("renders matches when searching with matches", () => {
    const result = makeResult({
      matches: [makeSnippet({ text: "match1" }), makeSnippet({ text: "match2" })],
      matchCount: 2,
    });
    const md = sessionDetailMarkdown(result, true, "Claude");
    expect(md).toContain("### 2 Matches");
    expect(md).toContain("match1");
    expect(md).toContain("match2");
  });

  it("renders single match without plural", () => {
    const result = makeResult({ matches: [makeSnippet({ text: "only" })], matchCount: 1 });
    const md = sessionDetailMarkdown(result, true, "Claude");
    expect(md).toContain("### 1 Match\n");
  });

  it("falls back to preview when searching with no matches", () => {
    const result = makeResult({ preview: [makeSnippet({ text: "preview msg" })] });
    const md = sessionDetailMarkdown(result, true, "Claude");
    expect(md).toContain("preview msg");
    expect(md).not.toContain("Match");
  });

  it("renders preview when not searching", () => {
    const result = makeResult({ preview: [makeSnippet({ text: "preview text" })] });
    const md = sessionDetailMarkdown(result, false, "Claude");
    expect(md).toContain("preview text");
  });

  it("returns no content message when empty", () => {
    const result = makeResult();
    expect(sessionDetailMarkdown(result, false, "Claude")).toBe("*No content available*");
  });
});

// ---------------------------------------------------------------------------
// wslDropdownLabel
// ---------------------------------------------------------------------------

describe("wslDropdownLabel", () => {
  it("returns [distro] label for WSL dir", () => {
    expect(wslDropdownLabel("wsl:Ubuntu:/home/user/project", "projects/project")).toBe("[Ubuntu] projects/project");
  });

  it("returns plain label for non-WSL dir", () => {
    expect(wslDropdownLabel("some-project-dir", "projects/myapp")).toBe("projects/myapp");
  });
});
