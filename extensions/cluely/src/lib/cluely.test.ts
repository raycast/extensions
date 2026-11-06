import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  filterMeetings,
  findCli,
  listArguments,
  loadMeeting,
  loadMeetings,
  mergeMeetings,
  parseDetail,
  parsePage,
  readableError,
  runCli,
  shellQuote,
  transcriptText,
} from "./cluely";

const row = {
  id: "session-a",
  title: "Planning",
  state: "finished",
  createdAt: "2026-10-10T12:00:00Z",
  tags: [{ id: "tag-a", name: "Sales" }],
};
describe("Official CLI response handling", () => {
  it("handles nullable titles and paginated lists", () => {
    expect(
      parsePage({
        items: [{ ...row, title: null }],
        nextCursor: "cursor 2",
        total: 90,
      }),
    ).toMatchObject({
      items: [{ title: "Untitled meeting" }],
      nextCursor: "cursor 2",
      total: 90,
    });
  });
  it("rejects malformed lists and cursors instead of claiming an empty account", () => {
    expect(() => parsePage({ items: "wrong" })).toThrow();
    expect(() => parsePage({ items: [], nextCursor: 2 })).toThrow();
    expect(() => parsePage({ items: [{ title: "missing id" }] })).toThrow();
  });
  it("rejects a response for a different meeting", () => {
    expect(() => parseDetail(row, "session-b")).toThrow("different meeting");
  });
  it("keeps transcript text verbatim and readable timestamps", () => {
    const detail = parseDetail(
      {
        ...row,
        summary: null,
        transcript: [
          {
            role: "user",
            text: "Keep `code` and **format**",
            relativeMs: 61500,
          },
        ],
      },
      row.id,
    );
    expect(detail.summary).toBe("");
    expect(transcriptText(detail.transcript)).toBe(
      "[1:01] user: Keep `code` and **format**",
    );
  });
  it("ignores optional malformed entries while preserving valid transcript entries", () => {
    expect(
      parseDetail(
        {
          ...row,
          transcript: [null, { text: "hello" }, { text: 3 }],
          attendees: [{ email: "demo@example.invalid" }, null],
        },
        row.id,
      ),
    ).toMatchObject({
      transcript: [{ role: "Speaker", text: "hello" }],
      attendees: ["demo@example.invalid"],
    });
  });
  it("filters loaded titles and tags without implying transcript search", () => {
    const items = [
      parsePage({ items: [row] }).items[0],
      { ...row, id: "other", title: "Design", tags: [] },
    ];
    expect(
      filterMeetings(items, "  SALES plan ").map((item) => item.id),
    ).toEqual(["session-a"]);
    expect(filterMeetings(items, "transcript")).toEqual([]);
    expect(filterMeetings(items, "")).toHaveLength(2);
  });
  it("deduplicates overlapping pages while keeping the newest response", () => {
    expect(
      mergeMeetings(
        [row],
        [
          { ...row, title: "Updated" },
          { ...row, id: "next" },
        ],
      ),
    ).toEqual([
      { ...row, title: "Updated" },
      { ...row, id: "next" },
    ]);
  });
  it("uses supported filters and keeps pagination values as arguments", () => {
    expect(
      listArguments({
        state: "finished",
        since: "7d",
        cursor: "$(touch /tmp/injected)",
      }),
    ).toEqual([
      "sessions",
      "list",
      "--json",
      "--limit",
      "50",
      "--state",
      "finished",
      "--since",
      "7d",
      "--cursor",
      "$(touch /tmp/injected)",
    ]);
    expect(() => listArguments({ state: "invalid" as "finished" })).toThrow();
    expect(() => listArguments({ since: "2y" as "7d" })).toThrow();
  });
  it("quotes custom paths in copied sign-in commands", () => {
    expect(shellQuote("/tmp/it's cluely")).toBe("'/tmp/it'\\''s cluely'");
  });
});

describe("Real subprocess boundary", () => {
  let folder: string;
  let fixture: string;
  beforeAll(async () => {
    folder = await mkdtemp(join(tmpdir(), "cluely-extension-test-"));
    fixture = join(folder, "cluely fixture");
    await writeFile(
      fixture,
      `#!${process.execPath}\nconst args=process.argv.slice(2);\nif(args[0]==='auth'){console.error('not logged in');process.exit(1);}\nif(args.includes('broken')){console.error('API error: SECRET_BODY');process.exit(1);}\nif(args[1]==='get'){console.log(JSON.stringify({...${JSON.stringify(row)},id:args[2],summary:'Summary',transcript:[{role:'speaker',text:'Transcript'}]}));}\nelse {console.log(JSON.stringify({items:[${JSON.stringify(row)}],nextCursor:'next',args}));}\n`,
    );
    await chmod(fixture, 0o755);
  });
  afterAll(async () => {
    await rm(folder, { recursive: true, force: true });
  });
  it("resolves an executable path with spaces", async () => {
    await expect(findCli(fixture)).resolves.toBe(fixture);
    await expect(findCli("relative/path")).rejects.toThrow("absolute");
    await expect(findCli(folder)).rejects.toThrow("executable");
  });
  it("passes shell metacharacters without interpreting them", async () => {
    const value = "$(touch /tmp/cluely-injected); quote ' &";
    const response = JSON.parse(
      await runCli(fixture, listArguments({ cursor: value })),
    );
    expect(response.args.at(-1)).toBe(value);
  });
  it("reads official-style JSON through list/get subprocesses", async () => {
    await expect(loadMeetings(fixture, {})).resolves.toMatchObject({
      items: [row],
      nextCursor: "next",
    });
    await expect(loadMeeting(fixture, row.id)).resolves.toMatchObject({
      summary: "Summary",
      transcript: [{ text: "Transcript" }],
    });
  });
  it("shows a sign-in instruction without exposing underlying private errors", async () => {
    await expect(runCli(fixture, ["auth", "status"])).rejects.toMatchObject({
      kind: "signed-out",
    });
    try {
      await runCli(fixture, ["broken"]);
    } catch (error) {
      expect(readableError(error)).not.toContain("SECRET_BODY");
    }
  });
  it("does not treat an option-like ID as a meeting ID", async () => {
    await expect(loadMeeting(fixture, "--help")).rejects.toThrow(
      "unsupported ID",
    );
  });
  it("honors cancellation without turning it into a sign-in failure", async () => {
    const abort = new AbortController();
    abort.abort();
    await expect(
      runCli(fixture, ["auth", "status"], abort.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
