import { beforeEach, describe, expect, it, vi } from "vitest";
import { AmplenoteApi, createApi, dailyJotName, Note, Task } from "../src/lib/api";
import { aNote, aTask, aTaskDomain, fakeAmplenote, secondsFromNow } from "./builders";

const state = vi.hoisted(() => ({ api: undefined as unknown as AmplenoteApi }));

vi.mock("../src/lib/amplenote", () => ({
  get amplenote() {
    return state.api;
  },
  dailyJotTag: "daily-jots",
  isDailyJot: (note: Note) => note.tags.includes("daily-jots"),
}));

const { default: searchTasks } = await import("../src/tools/search-tasks");
const { default: addTask } = await import("../src/tools/add-task");
const { default: getNote } = await import("../src/tools/get-note");
const { default: searchNotes } = await import("../src/tools/search-notes");
const { default: updateTask } = await import("../src/tools/update-task");
const { default: appendToNote } = await import("../src/tools/append-to-note");
const { default: getNoteTasks } = await import("../src/tools/get-note-tasks");
const { default: getDailyJot } = await import("../src/tools/get-daily-jot");

function useAmplenote(data: { notes?: Note[]; tasks?: Task[]; completed?: Task[] }) {
  const domain = aTaskDomain();
  const fake = fakeAmplenote({
    filterNotes: () => ({ notes: data.notes ?? [] }),
    searchNotes: () => ({ notes: data.notes ?? [] }),
    getTaskDomains: () => ({ taskDomains: [domain] }),
    getTaskDomainTasks: () => ({ tasks: data.tasks ?? [] }),
    getCompletedTasks: () => ({ tasks: data.completed ?? [] }),
    insertTask: () => ({ taskUUID: "new-task" }),
    createNote: () => ({ noteUUID: "new-jot" }),
    getNoteMetadata: () => {
      throw new Error("Output validation error: Invalid structured content for tool getNoteMetadata");
    },
  });
  state.api = createApi(fake.call);
  return fake;
}

describe("search-tasks tool", () => {
  const work = aNote({ name: "Work", tags: ["work"] });
  const home = aNote({ name: "Home", tags: ["home"] });
  const overdue = aTask({ noteUUID: work.uuid, content: "Send invoice", deadline: secondsFromNow(-3600), score: 1 });
  const someday = aTask({ noteUUID: home.uuid, content: "Fix shelf", score: 5 });
  const hidden = aTask({ noteUUID: home.uuid, content: "Later", hideUntil: secondsFromNow(3600) });

  beforeEach(() => {
    useAmplenote({ notes: [work, home], tasks: [overdue, someday, hidden] });
  });

  it("returns open, visible tasks sorted by score with their note names", async () => {
    const result = await searchTasks({});
    expect(result?.tasks.map((task) => [task.title, task.noteName])).toEqual([
      ["Fix shelf", "Home"],
      ["Send invoice", "Work"],
    ]);
  });

  it("filters by group, tag, and text", async () => {
    expect((await searchTasks({ view: "overdue" }))?.tasks.map((t) => t.title)).toEqual(["Send invoice"]);
    expect((await searchTasks({ tag: "home" }))?.tasks.map((t) => t.title)).toEqual(["Fix shelf"]);
    expect((await searchTasks({ query: "INVOICE" }))?.tasks.map((t) => t.title)).toEqual(["Send invoice"]);
  });

  it("lists recently completed tasks, newest first", async () => {
    useAmplenote({
      notes: [work],
      completed: [
        aTask({ content: "Older", completedAt: secondsFromNow(-7200) }),
        aTask({ content: "Newer", completedAt: secondsFromNow(-60) }),
      ],
    });
    const result = await searchTasks({ view: "completed" });
    expect(result?.tasks.map((task) => [task.title, task.group])).toEqual([
      ["Newer", "completed"],
      ["Older", "completed"],
    ]);
  });
});

describe("add-task tool", () => {
  it("adds to today's Daily Jot by default, creating it if needed", async () => {
    const fake = useAmplenote({ notes: [] });

    const result = await addTask({ content: "  Call the plumber ", urgent: true });

    expect(result?.noteUUID).toBe("new-jot");
    expect(result?.inTaskDomain).toBe(false);
    const { task } = fake.callsTo("insertTask")[0].args as { task: Task };
    expect(task).toMatchObject({ content: "Call the plumber", urgent: true, important: false });
  });

  it("adds to a named note and schedules date-only start dates at 9:00", async () => {
    const inbox = aNote({ name: "Inbox" });
    const fake = useAmplenote({ notes: [inbox] });

    await addTask({ content: "Buy milk", noteName: "inbox", startDate: "2026-10-20" });

    const { noteUUID, task } = fake.callsTo("insertTask")[0].args as { noteUUID: string; task: Task };
    expect(noteUUID).toBe(inbox.uuid);
    expect(new Date((task.startAt ?? 0) * 1000)).toEqual(new Date("2026-10-20T09:00:00"));
  });

  it("explains unknown note names and invalid dates", async () => {
    useAmplenote({ notes: [] });
    await expect(addTask({ content: "x", noteName: "Nope" })).rejects.toThrow('No note named "Nope"');
    await expect(addTask({ content: "x", startDate: "next week" })).rejects.toThrow("not a valid date");
  });
});

describe("get-note tool", () => {
  it("turns Amplenote's validation error for unknown ids into a clear message", async () => {
    useAmplenote({});
    await expect(getNote({ noteUUID: "missing" })).rejects.toThrow('No note with id "missing"');
  });
});

describe("search-notes tool", () => {
  it("skips archived notes unless asked and filters by tag", async () => {
    const current = aNote({ name: "Current", tags: ["projects/homelab"] });
    const archived = aNote({ name: "Old", tags: ["projects"], archived: true });
    useAmplenote({ notes: [current, archived] });

    expect((await searchNotes({}))?.notes.map((n) => n.name)).toEqual(["Current"]);
    expect((await searchNotes({ includeArchived: true, tag: "projects" }))?.notes.map((n) => n.name)).toEqual([
      "Current",
      "Old",
    ]);
  });
});

describe("update-task tool", () => {
  it("moves a deadline, which is what makes a task overdue", async () => {
    const task = aTask({ deadline: secondsFromNow(-86400) });
    const fake = fakeAmplenote({
      getTask: () => ({ task }),
      updateTask: () => ({ success: true }),
    });
    state.api = createApi(fake.call);

    await updateTask({ taskUUID: task.uuid, deadline: "2026-10-19" });

    expect(fake.callsTo("updateTask")[0].args).toEqual({
      taskUUID: task.uuid,
      updates: { deadline: Math.floor(new Date("2026-10-19T09:00:00").getTime() / 1000) },
    });
  });

  it("removes a deadline when given an empty string", async () => {
    const task = aTask({ deadline: secondsFromNow(-86400) });
    const fake = fakeAmplenote({ getTask: () => ({ task }), updateTask: () => ({ success: true }) });
    state.api = createApi(fake.call);

    await updateTask({ taskUUID: task.uuid, deadline: "" });

    expect(fake.callsTo("updateTask")[0].args.updates).toEqual({ deadline: null });
  });
});

describe("append-to-note tool", () => {
  it("appends to the end of today's Daily Jot by default", async () => {
    const fake = fakeAmplenote({
      filterNotes: () => ({ notes: [] }),
      createNote: () => ({ noteUUID: "jot" }),
      insertNoteContent: () => ({}),
    });
    state.api = createApi(fake.call);

    const result = await appendToNote({ content: "- Ask Sam about the venue" });

    expect(result).toMatchObject({ noteUUID: "jot", position: "end" });
    expect(fake.callsTo("insertNoteContent")[0].args).toEqual({
      noteUUID: "jot",
      markdownContent: "- Ask Sam about the venue",
      atEnd: true,
    });
  });

  it("can add to the start of a note chosen by id", async () => {
    const note = aNote({ name: "Inbox" });
    const fake = fakeAmplenote({ getNoteMetadata: () => ({ note }), insertNoteContent: () => ({}) });
    state.api = createApi(fake.call);

    await appendToNote({ content: "Top line", noteUUID: note.uuid, position: "start" });

    expect(fake.callsTo("insertNoteContent")[0].args).toMatchObject({ noteUUID: note.uuid, atEnd: false });
  });

  it("explains unknown note ids", async () => {
    state.api = createApi(
      fakeAmplenote({
        getNoteMetadata: () => {
          throw new Error("Output validation error");
        },
      }).call,
    );
    await expect(appendToNote({ content: "x", noteUUID: "missing" })).rejects.toThrow('No note with id "missing"');
  });
});

describe("get-note-tasks tool", () => {
  it("lists a note's tasks by name, optionally including done ones", async () => {
    const inbox = aNote({ name: "Inbox" });
    const fake = fakeAmplenote({
      filterNotes: () => ({ notes: [inbox] }),
      getNoteTasks: () => ({ tasks: [aTask({ noteUUID: inbox.uuid, content: "Call Bob" })] }),
    });
    state.api = createApi(fake.call);

    const result = await getNoteTasks({ noteName: "inbox", includeDone: true });

    expect(result?.tasks.map((task) => [task.title, task.noteName])).toEqual([["Call Bob", "Inbox"]]);
    expect(fake.callsTo("getNoteTasks")[0].args).toEqual({ noteUUID: inbox.uuid, includeDone: true });
  });
});

describe("get-daily-jot tool", () => {
  it("returns yesterday's jot and its date without creating anything", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const jot = aNote({ name: dailyJotName(yesterday), tags: ["daily-jots"] });
    const fake = fakeAmplenote({ filterNotes: () => ({ notes: [jot] }) });
    state.api = createApi(fake.call);

    const result = await getDailyJot({ daysFromToday: -1 });

    expect(result?.dailyJot).toMatchObject({ name: jot.name, exists: true, noteUUID: jot.uuid });
    expect(result?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result?.weekday).toBe(yesterday.toLocaleDateString("en-US", { weekday: "long" }));
    expect(fake.callsTo("createNote")).toHaveLength(0);
  });

  it("reports a missing jot", async () => {
    state.api = createApi(fakeAmplenote({ filterNotes: () => ({ notes: [] }) }).call);
    expect((await getDailyJot({}))?.dailyJot).toMatchObject({ exists: false, noteUUID: null, url: null });
  });
});

describe("task results", () => {
  it("keep the raw Markdown next to the plain title, so links survive", async () => {
    const note = aNote({ name: "Work" });
    const content = "Review doc [↗](https://docs.example.com/d/abc?gtask=123)";
    state.api = createApi(
      fakeAmplenote({
        filterNotes: () => ({ notes: [note] }),
        getNoteTasks: () => ({ tasks: [aTask({ noteUUID: note.uuid, content })] }),
      }).call,
    );

    const [task] = (await getNoteTasks({ noteName: "Work" }))!.tasks;

    expect(task.title).toBe("Review doc ↗");
    expect(task.content).toBe(content);
  });
});

describe("get-note backlinks", () => {
  const note = aNote({ name: "Olga" });
  const linking = aNote({ name: "1 on 1 - Olga", tags: ["people"] });

  function useFake() {
    const fake = fakeAmplenote({
      getNoteMetadata: () => ({ note }),
      getNoteContent: () => ({ markdown: "# Olga" }),
      getNoteBacklinks: () => ({ notes: [linking] }),
    });
    state.api = createApi(fake.call);
    return fake;
  }

  it("returns backlinks only when asked", async () => {
    const fake = useFake();
    const plain = await getNote({ noteUUID: note.uuid });
    expect(plain).not.toHaveProperty("backlinks");
    expect(fake.callsTo("getNoteBacklinks")).toHaveLength(0);

    const withLinks = (await getNote({ noteUUID: note.uuid, includeBacklinks: true })) as Record<string, unknown>;
    expect(withLinks.backlinkCount).toBe(1);
    expect(withLinks.backlinks).toEqual([
      expect.objectContaining({ noteUUID: linking.uuid, name: "1 on 1 - Olga", tags: ["people"], archived: false }),
    ]);
  });

  it("caps long backlink lists and reports the full count", async () => {
    const many = Array.from({ length: 80 }, (_, index) => aNote({ name: `Mention ${index}` }));
    state.api = createApi(
      fakeAmplenote({
        getNoteMetadata: () => ({ note }),
        getNoteContent: () => ({ markdown: "" }),
        getNoteBacklinks: () => ({ notes: many }),
      }).call,
    );
    const result = (await getNote({ noteUUID: note.uuid, includeBacklinks: true })) as Record<string, unknown>;
    expect(result.backlinkCount).toBe(80);
    expect(result.backlinks).toHaveLength(50);
  });

  it("says when backlinks could not be loaded instead of returning an empty list", async () => {
    state.api = createApi(
      fakeAmplenote({
        getNoteMetadata: () => ({ note }),
        getNoteContent: () => ({ markdown: "" }),
        getNoteBacklinks: () => {
          throw new Error("Unknown tool");
        },
      }).call,
    );
    const result = (await getNote({ noteUUID: note.uuid, includeBacklinks: true })) as Record<string, unknown>;
    expect(result.backlinks).toBeNull();
    expect(result.backlinksError).toMatch(/Could not load backlinks/);
  });
});
