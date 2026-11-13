import { describe, expect, it } from "vitest";
import { KansoError, callTool } from "../client";
import {
  INBOX_ID,
  createdId,
  errorCopy,
  noteArgs,
  noteChoices,
  noteLink,
  notebookChoices,
  notebookName,
  previewLine,
  readWhen,
  splitCapture,
  taskArgs,
  taskToast,
} from "../capture-logic";
import { addTask, createNote, parseWhen } from "../kanso";
import { json, refused, scripted } from "./helpers";

function rpc(result: unknown, isError = false) {
  return json(200, {
    jsonrpc: "2.0",
    id: 1,
    result: {
      content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result) }],
      isError,
    },
  });
}

describe("Quick Capture requests", () => {
  it("makes the first line the title and the rest the body", () => {
    expect(splitCapture("Pixel idea\n\nwide shots\nat dawn")).toEqual({
      title: "Pixel idea",
      body: "wide shots\nat dawn",
    });
    expect(splitCapture("  just one line  ")).toEqual({ title: "just one line", body: "" });
    expect(splitCapture("a\r\nb")).toEqual({ title: "a", body: "b" });
  });

  it("keeps a first line that is too long for a title whole in the body", () => {
    const long = "x".repeat(200);
    const { title, body } = splitCapture(`${long}\nmore`);
    expect(title).toHaveLength(128);
    expect(body).toBe(`${long}\n\nmore`);
  });

  it("sends only fields a Capture key may set, to the Inbox by default", () => {
    expect(noteArgs("Idea\nbody", "")).toEqual({ bookId: INBOX_ID, title: "Idea", body: "body" });
    expect(noteArgs("Idea", "book:work")).toEqual({ bookId: "book:work", title: "Idea", body: "" });
  });

  it("lists the Inbox first, then notebooks by name, and no trash or templates", () => {
    const choices = notebookChoices([
      { _id: "book:work", name: "Work" },
      { _id: "book:inbox", name: "Inbox" },
      { _id: "book:art", name: "Art" },
      { _id: "trash", name: "Trash" },
      { _id: "template", name: "Templates" },
    ]);
    expect(choices.map((b) => b.id)).toEqual(["book:inbox", "book:art", "book:work"]);
    expect(notebookChoices(undefined)).toEqual([{ id: INBOX_ID, name: "Inbox" }]);
    expect(notebookName(choices, "book:work")).toBe("Work");
  });

  it("builds the open link in the phone's format", () => {
    expect(noteLink("note:abc123")).toBe("kanso://open/note/note%3Aabc123");
  });

  it("reads the id of the note that was made", () => {
    expect(createdId({ _id: "note:1", ok: true })).toBe("note:1");
    expect(createdId({ id: "note:2" })).toBe("note:2");
    expect(createdId("saved")).toBeUndefined();
  });

  it("calls create-note over MCP with the key", async () => {
    const { env, calls } = scripted([rpc({ _id: "note:9" })]);
    const made = await createNote(env, 19840, "kcl_key", noteArgs("Hi\nthere", "book:work"));
    expect(createdId(made)).toBe("note:9");
    const sent = JSON.parse(String(calls[0].init?.body));
    expect(sent.params).toEqual({
      name: "create-note",
      arguments: { bookId: "book:work", title: "Hi", body: "there" },
    });
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe("Bearer kcl_key");
  });
});

describe("Add Task requests", () => {
  it("goes to today's daily note by default", () => {
    expect(taskArgs("  call Sam tomorrow 9am ", "daily")).toEqual({ text: "call Sam tomorrow 9am", target: "daily" });
    expect(taskArgs("x", "")).toEqual({ text: "x", target: "daily" });
  });

  it("goes to the Inbox task list or to one chosen note, never both", () => {
    expect(taskArgs("x", "inbox")).toEqual({ text: "x", target: "inbox" });
    expect(taskArgs("x", "note:abc")).toEqual({ text: "x", noteId: "note:abc" });
  });

  it("offers recent notes but not daily notes, which have their own entry", () => {
    expect(
      noteChoices([
        { _id: "note:daily-2026-11-12", title: "12 Nov" },
        { _id: "note:a", title: "Plan" },
        { _id: "note:b", title: " " },
        { _id: "book:x" },
      ]),
    ).toEqual([
      { id: "note:a", title: "Plan" },
      { id: "note:b", title: "Untitled" },
    ]);
  });

  it("calls kanso-add-task and kanso-parse-when with the text", async () => {
    const { env, calls } = scripted([
      rpc({ noteId: "note:1" }),
      rpc({ text: "x", due: null, repeat: null, label: null }),
    ]);
    await addTask(env, 19840, "kcl_k", taskArgs("x", "inbox"));
    await parseWhen(env, 19840, "kcl_k", "x");
    expect(JSON.parse(String(calls[0].init?.body)).params).toEqual({
      name: "kanso-add-task",
      arguments: { text: "x", target: "inbox" },
    });
    expect(JSON.parse(String(calls[1].init?.body)).params).toEqual({
      name: "kanso-parse-when",
      arguments: { text: "x" },
    });
  });
});

describe("the live preview", () => {
  const parsed = {
    text: "film Pixel review",
    due: "2026-11-14T15:00",
    repeat: "every week",
    label: "Fri 14 Nov, 15:00 · every week",
  };

  it("shows Kanso's own label, so it matches the saved task", () => {
    expect(previewLine("film Pixel review fri 3pm every week", readWhen(parsed), false)).toBe(parsed.label);
  });

  it("says a task with no date is saved as written", () => {
    const none = readWhen({ text: "just a task", due: null, repeat: null, label: null });
    expect(none).toEqual({ text: "just a task", due: null, repeat: null, label: null });
    expect(previewLine("just a task", none, false)).toBe("No date or repeat. It will be saved as written.");
  });

  it("asks for a task when the field is empty, and waits while reading", () => {
    expect(previewLine("  ", undefined, false)).toMatch(/^Type a task/);
    expect(previewLine("fri", undefined, true)).toBe("Reading the date…");
  });

  it("ignores an answer that is not a parse", () => {
    expect(readWhen("nope")).toBeUndefined();
    expect(readWhen({ due: "x" })).toBeUndefined();
  });

  it("reads the toast title from the label", () => {
    expect(taskToast({ noteId: "note:d", label: "Fri 14 Nov, 15:00 · every week" })).toEqual({
      title: "Task added · Fri 14 Nov 15:00 · every week",
      noteId: "note:d",
    });
    expect(taskToast({ noteId: "note:d", label: null })).toEqual({ title: "Task added", noteId: "note:d" });
  });
});

describe("error copy", () => {
  it("shows Kanso's refusal of a Capture key as written", async () => {
    const copy =
      "This key can add notes and tasks and tick tasks, but it can't change or delete what is already there. In Kanso, open Settings › Local API › API keys and create a key that can read and write.";
    const { env } = scripted([rpc(copy, true)]);
    const e = await callTool(env, 19840, "kcl_k", "update-note", {}).catch((x) => x);
    expect(errorCopy(e)).toEqual({ title: "This key can't do that", message: copy });
  });

  it("shows the 403 from a REST-shaped refusal the same way", async () => {
    const reason = "This key can only add a new note, with a notebook, title, text, status and tags.";
    const { env } = scripted([json(403, { error: "forbidden", reason })]);
    const e = await callTool(env, 19840, "kcl_k", "create-note", {}).catch((x) => x);
    expect(errorCopy(e).message).toBe(reason);
  });

  it("says Kanso isn't open when nothing answers and Kanso is not running", async () => {
    const { env } = scripted([refused()], false);
    const e = await createNote(env, 19840, "kcl_k", noteArgs("x", "")).catch((x) => x);
    expect(errorCopy(e)).toEqual({ title: "Kanso isn't open. Open Kanso, then try again." });
  });

  it("says the local API is off when Kanso runs but refuses", async () => {
    const { env } = scripted([refused()], true);
    const e = await parseWhen(env, 19840, "kcl_k", "x").catch((x) => x);
    expect(errorCopy(e).title).toBe("Kanso's local API is off. Turn it on in Kanso › Settings › Local API.");
  });

  it("tells a 401 to connect again", () => {
    expect(errorCopy(new KansoError("unauthorized", 19840)).title).toBe(
      "Kanso no longer knows this key. Connect again.",
    );
  });

  it("does not swallow an unknown failure", () => {
    expect(errorCopy(new Error("boom"))).toEqual({ title: "Couldn't reach Kanso", message: "boom" });
  });
});
