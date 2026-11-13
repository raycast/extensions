import { describe, expect, it } from "vitest";
import { taskArgs } from "../capture-logic";
import { listRecentNotes, readNote, searchNotes } from "../kanso";
import {
  EMPTY_PREVIEW,
  LOCKED_PREVIEW,
  hasTasks,
  noteActions,
  noteRows,
  previewMarkdown,
  readBody,
  searchRequest,
  subtitleFor,
  updatedLabel,
} from "../search-logic";
import { json, scripted } from "./helpers";

function rpc(result: unknown) {
  return json(200, {
    jsonrpc: "2.0",
    id: 1,
    result: { content: [{ type: "text", text: JSON.stringify(result) }], isError: false },
  });
}

const sent = (call: { init?: RequestInit }) => JSON.parse(String(call.init?.body)).params;

describe("search mapping", () => {
  it("maps notes to rows and drops other documents", () => {
    const rows = noteRows([
      { _id: "note:a", title: " Pixel review ", bookId: "book:work", updatedAt: 1700000000000, body: "wide shots" },
      { _id: "book:work", name: "Work" },
      { _id: "note:b", title: "", body: 5 },
      "junk",
    ]);
    expect(rows).toEqual([
      {
        id: "note:a",
        title: "Pixel review",
        bookId: "book:work",
        updatedAt: 1700000000000,
        snippet: "wide shots",
        locked: false,
      },
      { id: "note:b", title: "Untitled", bookId: undefined, updatedAt: undefined, snippet: "", locked: false },
    ]);
    expect(noteRows(undefined)).toEqual([]);
  });

  it("shows the notebook name and a short updated date", () => {
    const [row] = noteRows([{ _id: "note:a", title: "A", bookId: "book:work" }]);
    expect(subtitleFor(row, [{ id: "book:work", name: "Work" }])).toBe("Work");
    expect(subtitleFor(row, [])).toBe("");
    const now = new Date(2026, 10, 12);
    expect(updatedLabel(new Date(2026, 10, 3).getTime(), now)).toBe("3 Nov");
    expect(updatedLabel(new Date(2025, 10, 3).getTime(), now)).toBe("3 Nov 2025");
    expect(updatedLabel(undefined, now)).toBeUndefined();
  });

  it("sends the keyword to search-notes and calls only read tools", async () => {
    const { env, calls } = scripted([rpc([{ _id: "note:a", title: "A" }])]);
    const docs = await searchNotes(env, 19840, "kcl_k", searchRequest("  pixel  "));
    expect(noteRows(docs)).toHaveLength(1);
    expect(sent(calls[0])).toEqual({ name: "search-notes", arguments: { keyword: "pixel" } });
  });
});

describe("empty query shows recents", () => {
  it("asks list-notes, newest first, when there is nothing typed", async () => {
    expect(searchRequest("")).toEqual({ tool: "list-notes", args: { sort: "updatedAt", limit: 30 } });
    expect(searchRequest("   ").tool).toBe("list-notes");
    const { env, calls } = scripted([rpc([])]);
    await searchNotes(env, 19840, "kcl_k", searchRequest(""));
    expect(sent(calls[0]).name).toBe("list-notes");
    await listRecentNotes(env, 19840, "kcl_k");
    expect(sent(calls[1]).arguments).toEqual({ sort: "updatedAt", limit: 30 });
  });
});

describe("locked notes", () => {
  it("never carries or shows a locked note's body", () => {
    const [row] = noteRows([{ _id: "note:l", title: "Secret", body: "plain text", kansoLock: { v: 1 } }]);
    expect(row.locked).toBe(true);
    expect(row.snippet).toBe("");
    const md = previewMarkdown(row, undefined);
    expect(md).toContain(LOCKED_PREVIEW);
    expect(md).not.toContain("plain text");
    // Even when read-note hands back a body, a lock flag wins.
    const full = readBody({ _id: "note:l", locked: true, body: "plain text" });
    expect(full).toEqual({ body: "", locked: true });
    expect(previewMarkdown({ ...row, locked: false }, full)).not.toContain("plain text");
    expect(hasTasks(row, full)).toBe(false);
  });

  it("says so for an empty body instead of showing nothing", () => {
    const [row] = noteRows([{ _id: "note:e", title: "Quiet", body: "" }]);
    expect(previewMarkdown(row, { body: "", locked: false })).toContain(EMPTY_PREVIEW);
  });
});

describe("preview and actions", () => {
  it("previews the full body from read-note", async () => {
    const { env, calls } = scripted([rpc({ _id: "note:a", title: "A", body: "- [ ] film\nmore" })]);
    const full = readBody(await readNote(env, 19840, "kcl_k", "note:a"));
    expect(sent(calls[0])).toEqual({ name: "read-note", arguments: { noteId: "note:a" } });
    const [row] = noteRows([{ _id: "note:a", title: "A", body: "start" }]);
    expect(previewMarkdown(row, undefined)).toBe("# A\n\nstart");
    expect(previewMarkdown(row, full)).toBe("# A\n\n- [ ] film\nmore");
  });

  it("opens and copies the kanso link, and copies the title", () => {
    const [row] = noteRows([{ _id: "note:a b", title: "Pixel review" }]);
    expect(noteActions(row)).toEqual({
      open: "kanso://open/note/note%3Aa%20b",
      link: "kanso://open/note/note%3Aa%20b",
      title: "Pixel review",
    });
  });

  it("offers Add Task Here only for a note with task lines, and preselects that note", () => {
    const [plain, tasks] = noteRows([
      { _id: "note:p", title: "P", body: "just text" },
      { _id: "note:t", title: "T", body: "intro\n- [ ] one" },
    ]);
    expect(hasTasks(plain, undefined)).toBe(false);
    expect(hasTasks(tasks, undefined)).toBe(true);
    expect(hasTasks(plain, { body: "- [x] done", locked: false })).toBe(true);
    // Slice 16's Add Task sends the note id as the destination.
    expect(taskArgs("film review", tasks.id)).toEqual({ text: "film review", noteId: "note:t" });
  });
});
