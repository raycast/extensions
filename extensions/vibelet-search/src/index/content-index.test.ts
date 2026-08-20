import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  buildSearchArgs,
  ensureContentIndex,
  parseRgOutput,
  rebuildSegment,
  safeSegmentName,
  type OffsetEntry,
} from "./content-index";
import { loadSessionMessages } from "../load-messages";
import type { SessionMeta } from "../types";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vibelet-index-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeSession(name: string, lines: unknown[]): string {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return file;
}

function meta(id: string, filePath: string, source: SessionMeta["source"] = "claude-cli"): SessionMeta {
  return { id, title: "t", source, projectPath: "/p", timestamp: 0, filePath };
}

const user = (content: string) => ({
  type: "user",
  timestamp: "2026-04-10T10:00:00Z",
  message: { role: "user", content },
});
const assistant = (content: string) => ({
  type: "assistant",
  timestamp: "2026-04-10T10:00:01Z",
  message: { role: "assistant", content },
});
const codexAssistant = (content: string) => ({
  type: "response_item",
  timestamp: "2026-04-10T10:00:01Z",
  payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: content }] },
});

describe("safeSegmentName", () => {
  it("keeps [A-Za-z0-9_-] and replaces anything else", () => {
    expect(safeSegmentName("claude:019d-abc")).toBe("claude_019d-abc.txt");
    expect(safeSegmentName("codex:xyz")).toBe("codex_xyz.txt");
  });
});

describe("buildSearchArgs", () => {
  it("terminates options before the user query", () => {
    const args = buildSearchArgs("--help", 10, "/tmp/messages.txt");
    const terminatorIndex = args.indexOf("--");
    expect(terminatorIndex).toBeGreaterThan(-1);
    expect(args.slice(terminatorIndex)).toEqual(["--", "--help", "/tmp/messages.txt"]);
  });

  it("scopes the search to a single file and caps matches", () => {
    const args = buildSearchArgs("useEffect(", 100, "/cache/messages.txt");
    expect(args).toContain("/cache/messages.txt");
    expect(args).toContain("useEffect(");
    expect(args).toContain("100");
    // exactly one path argument after the `--` terminator
    const afterTerminator = args.slice(args.indexOf("--") + 1);
    expect(afterTerminator).toEqual(["useEffect(", "/cache/messages.txt"]);
  });
});

describe("seq contract: segment lines align with loadSessionMessages indices", () => {
  it("skips exactly the same user messages and keeps indices aligned", async () => {
    const filePath = writeSession("s.jsonl", [
      user("First prompt"),
      user("<system-reminder>auto-injected, hidden from view</system-reminder>"),
      assistant("Reply\nwith a newline"),
      user("要"),
    ]);
    const m = meta("s", filePath);

    await rebuildSegment(tmpDir, "claude:s", m);
    const messages = await loadSessionMessages(m);

    const segText = fs.readFileSync(path.join(tmpDir, "segments", safeSegmentName("claude:s")), "utf-8").trim();
    const lines = segText ? segText.split("\n") : [];

    expect(lines.length).toBe(messages.length);
    expect(messages.map((x) => x.content)).toEqual(["First prompt", "Reply\nwith a newline", "要"]);
    lines.forEach((line, i) => {
      const [idx, text] = line.split("\t");
      expect(Number(idx)).toBe(i);
      expect(text).toBe(messages[i].content.replace(/\r?\n/g, " "));
    });
  });

  it("indexes Codex sessions through the same adapter path", async () => {
    const filePath = writeSession("codex.jsonl", [
      { type: "session_meta", timestamp: "2026-04-10T10:00:00Z", payload: { id: "abc", cwd: "/p" } },
      {
        type: "response_item",
        timestamp: "2026-04-10T10:00:01Z",
        payload: { type: "message", role: "user", content: [{ type: "input_text", text: "Hi Codex" }] },
      },
      {
        type: "response_item",
        timestamp: "2026-04-10T10:00:02Z",
        payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "Hello!" }] },
      },
    ]);
    const m = meta("abc", filePath, "codex-cli");

    await rebuildSegment(tmpDir, "codex:abc", m);
    const messages = await loadSessionMessages(m);
    expect(messages.map((x) => x.content)).toEqual(["Hi Codex", "Hello!"]);

    const segText = fs.readFileSync(path.join(tmpDir, "segments", safeSegmentName("codex:abc")), "utf-8").trim();
    expect(segText.split("\n").length).toBe(2);
  });
});

describe("ensureContentIndex", () => {
  it("builds messages.txt + offsets.json with stable, ordered line numbers", async () => {
    const aPath = writeSession("a.jsonl", [user("hello from a"), user("second line in a")]);
    const bPath = writeSession("b.jsonl", [codexAssistant("reply in b")]);
    const a = meta("a", aPath);
    const b = meta("b", bPath, "codex-cli");

    await ensureContentIndex(tmpDir, [a, b], { changedKeys: ["claude:a", "codex:b"], removedKeys: [] });

    const offsets = JSON.parse(fs.readFileSync(path.join(tmpDir, "offsets.json"), "utf-8")) as {
      entries: Record<string, OffsetEntry>;
    };
    expect(offsets.entries["claude:a"]).toEqual({
      startLine: 1,
      msgCount: 2,
      filePath: aPath,
      source: "claude-cli",
    });
    expect(offsets.entries["codex:b"].startLine).toBe(3);
    expect(offsets.entries["codex:b"].msgCount).toBe(1);

    const messagesText = fs.readFileSync(path.join(tmpDir, "messages.txt"), "utf-8");
    expect(messagesText).toContain("0\thello from a");
    expect(messagesText).toContain("1\tsecond line in a");
    expect(messagesText).toContain("0\treply in b");
  });

  it("is a no-op when nothing changed and the index already covers every session", async () => {
    const aPath = writeSession("a.jsonl", [user("hello from a")]);
    const a = meta("a", aPath);

    await ensureContentIndex(tmpDir, [a], { changedKeys: ["claude:a"], removedKeys: [] });
    const before = fs.readFileSync(path.join(tmpDir, "offsets.json"), "utf-8");

    await ensureContentIndex(tmpDir, [a], { changedKeys: [], removedKeys: [] });
    expect(fs.readFileSync(path.join(tmpDir, "offsets.json"), "utf-8")).toBe(before);
  });

  it("rebuilds a changed segment and shifts later offsets accordingly", async () => {
    const aPath = writeSession("a.jsonl", [user("hello from a"), user("more a")]);
    const bPath = writeSession("b.jsonl", [codexAssistant("reply b")]);
    const a = meta("a", aPath);
    const b = meta("b", bPath, "codex-cli");

    await ensureContentIndex(tmpDir, [a, b], { changedKeys: ["claude:a", "codex:b"], removedKeys: [] });

    // a grows by one message → its segment changes, b's startLine must shift.
    fs.writeFileSync(
      aPath,
      [user("hello from a"), user("more a"), user("even more a")].map((l) => JSON.stringify(l)).join("\n") + "\n",
    );
    await ensureContentIndex(tmpDir, [a, b], { changedKeys: ["claude:a"], removedKeys: [] });

    const offsets = JSON.parse(fs.readFileSync(path.join(tmpDir, "offsets.json"), "utf-8")) as {
      entries: Record<string, OffsetEntry>;
    };
    expect(offsets.entries["claude:a"].msgCount).toBe(3);
    expect(offsets.entries["codex:b"].startLine).toBe(4);
  });

  it("drops segments for sessions that disappeared", async () => {
    const aPath = writeSession("a.jsonl", [user("hello from a")]);
    const a = meta("a", aPath);

    await ensureContentIndex(tmpDir, [a], { changedKeys: ["claude:a"], removedKeys: [] });
    await ensureContentIndex(tmpDir, [], { changedKeys: [], removedKeys: ["claude:a"] });

    const offsets = JSON.parse(fs.readFileSync(path.join(tmpDir, "offsets.json"), "utf-8")) as {
      entries: Record<string, OffsetEntry>;
    };
    expect(Object.keys(offsets.entries)).toEqual([]);
    expect(fs.existsSync(path.join(tmpDir, "segments", safeSegmentName("claude:a")))).toBe(false);
    // messages.txt is empty after stitching nothing
    expect(fs.readFileSync(path.join(tmpDir, "messages.txt"), "utf-8")).toBe("");
  });
});

describe("parseRgOutput", () => {
  const offsets: Record<string, OffsetEntry> = {
    "claude:aaa": { startLine: 1, msgCount: 2, filePath: "/a.jsonl", source: "claude-cli" },
    "codex:bbb": { startLine: 3, msgCount: 2, filePath: "/b.jsonl", source: "codex-cli" },
  };

  it("maps global line numbers back to session + message index", () => {
    const out = ["3:0\tI fixed the useEffect bug", "4:1\tany more errors?"].join("\n");
    const hits = parseRgOutput(out, offsets, "useEffect", 10);
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ sessionKey: "codex:bbb", msgIndex: 0 });
    expect(hits[0].snippet).toContain("useEffect");
    expect(hits[1]).toMatchObject({ sessionKey: "codex:bbb", msgIndex: 1 });
  });

  it("respects the limit", () => {
    const out = ["1:0\talpha", "2:1\tbeta"].join("\n");
    const hits = parseRgOutput(out, offsets, "x", 1);
    expect(hits).toHaveLength(1);
  });

  it("returns empty for no output", () => {
    expect(parseRgOutput("", offsets, "x", 10)).toEqual([]);
  });

  it("skips malformed lines", () => {
    const out = ["not-a-line-number", "5:0\tbeyond index", "3:0\tok"].join("\n");
    const hits = parseRgOutput(out, offsets, "x", 10);
    expect(hits).toHaveLength(1);
    expect(hits[0].sessionKey).toBe("codex:bbb");
  });
});
