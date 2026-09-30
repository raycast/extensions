import { execFile } from "child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildObsidianCursorScript, openObsidianAtMatch } from "../api/open-match/open-match.service";
import { ContentMatch } from "../api/search/content-match.service";

vi.mock("child_process", () => ({ execFile: vi.fn() }));

const match: ContentMatch = {
  line: 8,
  column: 4,
  endLine: 8,
  endColumn: 10,
  context: [],
};

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("Obsidian match navigation", () => {
  it("builds a script with zero-based editor positions", () => {
    const script = buildObsidianCursorScript(match, "folder/note.md");

    expect(script).toContain('"folder/note.md"');
    expect(script).toContain("app.workspace.getActiveFile()?.path !== targetPath");
    expect(script).toContain('return "waiting"');
    expect(script).toContain('return "raycast-match-applied"');
    expect(script).toContain('return "raycast-match-already-applied"');
    expect(script).toContain('{"line":7,"ch":3}');
    expect(script).toContain('{"line":7,"ch":9}');
    expect(script).toContain('editor.getCursor("anchor")');
    expect(script).toContain('editor.getCursor("head")');
    expect(script).toContain("editor.focus()");
    expect(script).toContain("editor.setSelection(from, to)");
    expect(script).toContain("editor.scrollIntoView({ from, to }, true)");
  });

  it("retries activation and reapplies the match while Obsidian settles", async () => {
    vi.useFakeTimers();
    const outputs = [
      "",
      "waiting",
      "raycast-layout-ready",
      "",
      "waiting",
      "raycast-match-applied",
      "raycast-match-already-applied",
    ];
    vi.mocked(execFile).mockImplementation((_file, _args, _options, callback) => {
      if (callback) callback(null, outputs.shift() ?? "", "");
      return undefined as never;
    });

    const opening = openObsidianAtMatch(
      { path: "/vault/folder/note.md" } as never,
      { name: "vault", path: "/vault" } as never,
      match
    );
    await vi.runAllTimersAsync();
    await opening;

    expect(execFile).toHaveBeenCalledTimes(7);
    expect(vi.mocked(execFile).mock.calls[0]?.[1]).toEqual(["vault=vault", "open", "path=folder/note.md"]);
    expect(vi.mocked(execFile).mock.calls[3]?.[1]).toEqual(["vault=vault", "open", "path=folder/note.md"]);
  });
});
