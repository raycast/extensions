import { describe, expect, it } from "vitest";
import { createApi, dailyJotName, isInTaskDomain, matchNoteByName, normalizeTag, TAG_PATTERN } from "../src/lib/api";
import { aNote, aTask, aTaskDomain, fakeAmplenote } from "./builders";

describe("notes", () => {
  it("hides plugin notes and plugin tags", async () => {
    const regular = aNote({ tags: ["work"] });
    const plugin = aNote({ tags: ["plugins/dashboard"] });
    const fake = fakeAmplenote({
      filterNotes: () => ({ notes: [regular, plugin] }),
      searchNotes: () => ({ notes: [plugin, regular] }),
      getTags: () => ({ tags: [{ text: "work" }, { text: "plugins" }, { text: "plugins/dashboard" }] }),
    });
    const api = createApi(fake.call);

    expect(await api.listNotes()).toEqual([regular]);
    expect(await api.searchNotes("x")).toEqual([regular]);
    expect((await api.getTags()).map((tag) => tag.text)).toEqual(["work"]);
  });

  it("lists notes by the requested sort order", async () => {
    const fake = fakeAmplenote({ filterNotes: () => ({ notes: [] }) });
    await createApi(fake.call).listNotes("title");
    expect(fake.callsTo("filterNotes")[0].args).toEqual({ sortOrder: "title" });
  });

  it("reads note content from the markdown field", async () => {
    const fake = fakeAmplenote({ getNoteContent: () => ({ markdown: "# Hi" }) });
    expect(await createApi(fake.call).getNoteContent("n")).toBe("# Hi");
  });

  it("matches note names case-insensitively and prefers non-archived notes", () => {
    const archived = aNote({ name: "Inbox", archived: true });
    const current = aNote({ name: "inbox" });
    expect(matchNoteByName([archived, current], " INBOX ")).toBe(current);
    expect(matchNoteByName([archived], "inbox")).toBe(archived);
    expect(matchNoteByName([current], "other")).toBeUndefined();
  });
});

describe("findOrCreateDailyJot", () => {
  const today = new Date("2026-10-18T12:00:00");
  const name = dailyJotName(today);

  it("uses today's jot when it exists", async () => {
    const jot = aNote({ name, tags: ["daily-jots"] });
    const fake = fakeAmplenote({ filterNotes: () => ({ notes: [aNote({ name }), jot] }) });

    expect(await createApi(fake.call).findOrCreateDailyJot(today)).toBe(jot);
    expect(fake.callsTo("createNote")).toHaveLength(0);
  });

  it("creates today's jot with the jot tag when it is missing", async () => {
    const fake = fakeAmplenote({
      filterNotes: () => ({ notes: [] }),
      createNote: () => ({ noteUUID: "new-jot" }),
    });

    const jot = await createApi(fake.call).findOrCreateDailyJot(today);

    expect(jot).toEqual({ uuid: "new-jot", name: "October 18th, 2026", tags: ["daily-jots"] });
    expect(fake.callsTo("createNote")[0].args).toEqual({ name: "October 18th, 2026", tags: ["daily-jots"] });
  });
});

describe("tasks", () => {
  it("sends every field Amplenote requires when inserting a task", async () => {
    const fake = fakeAmplenote({ insertTask: () => ({ taskUUID: "t1" }) });

    await createApi(fake.call).insertTask("note-1", { content: "Call Bob", important: true, startAt: 100 });

    const { noteUUID, task } = fake.callsTo("insertTask")[0].args as {
      noteUUID: string;
      task: Record<string, unknown>;
    };
    expect(noteUUID).toBe("note-1");
    expect(task).toMatchObject({
      noteUUID: "note-1",
      content: "Call Bob",
      startAt: 100,
      deadline: null,
      hideUntil: null,
      important: true,
      urgent: false,
      isRepeating: false,
    });
    expect(task.uuid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("completes, dismisses, and reopens tasks through updateTask", async () => {
    const fake = fakeAmplenote({ updateTask: () => ({ success: true }) });
    const api = createApi(fake.call);

    await api.completeTask("t1");
    await api.dismissTask("t1");
    await api.reopenTask("t1");

    const updates = fake.callsTo("updateTask").map((c) => c.args.updates as Record<string, number>);
    expect(updates[0].completedAt).toBeGreaterThan(0);
    expect(updates[1].dismissedAt).toBeGreaterThan(0);
    expect(updates[2]).toEqual({ completedAt: 0, dismissedAt: 0 });
  });

  it("merges open tasks from all task domains without duplicates", async () => {
    const work = aTaskDomain({ name: "Work" });
    const personal = aTaskDomain({ name: "Personal" });
    const shared = aTask();
    const workOnly = aTask();
    const fake = fakeAmplenote({
      getTaskDomains: () => ({ taskDomains: [work, personal] }),
      getTaskDomainTasks: ({ taskDomainUUID }) => ({
        tasks: taskDomainUUID === work.uuid ? [shared, workOnly] : [shared],
      }),
    });

    const { tasks } = await createApi(fake.call).listOpenTasks();

    expect(tasks).toHaveLength(2);
    expect(tasks.find((task) => task.uuid === shared.uuid)?.domainUUIDs).toEqual([work.uuid, personal.uuid]);
  });
});

describe("tags", () => {
  it("normalizes typed tags into Amplenote's format", () => {
    expect(normalizeTag(" Project X ")).toBe("project-x");
    expect(normalizeTag("projects/")).toBe("projects");
    expect(TAG_PATTERN.test(normalizeTag("Area/Work"))).toBe(true);
    expect(TAG_PATTERN.test(normalizeTag("bad_tag!"))).toBe(false);
  });
});

describe("findOrCreateDailyJot concurrency", () => {
  it("creates only one jot when two calls race", async () => {
    let created = 0;
    const fake = fakeAmplenote({
      filterNotes: () => ({ notes: [] }),
      createNote: async () => {
        created += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { noteUUID: "jot" };
      },
    });
    const api = createApi(fake.call);
    const day = new Date("2026-10-18T12:00:00");

    const [a, b] = await Promise.all([api.findOrCreateDailyJot(day), api.findOrCreateDailyJot(day)]);

    expect(created).toBe(1);
    expect(a.uuid).toBe(b.uuid);
  });
});

describe("task domains", () => {
  it("knows whether a note belongs to any task domain", () => {
    const domains = [aTaskDomain({ notes: [{ uuid: "a" }] }), aTaskDomain({ notes: [{ uuid: "b" }] })];
    expect(isInTaskDomain(domains, "b")).toBe(true);
    expect(isInTaskDomain(domains, "c")).toBe(false);
  });

  it("adds a note to a task domain", async () => {
    const fake = fakeAmplenote({ addTaskDomainNote: () => ({ success: true }) });
    await createApi(fake.call).addNoteToTaskDomain("note-1", "domain-1");
    expect(fake.callsTo("addTaskDomainNote")[0].args).toEqual({ noteUUID: "note-1", taskDomainUUID: "domain-1" });
  });
});

describe("createNote", () => {
  it("returns the permanent id instead of the temporary local one", async () => {
    const fake = fakeAmplenote({
      createNote: () => ({ noteUUID: "local-123" }),
      getNoteMetadata: ({ noteUUID }) => ({ note: aNote({ uuid: noteUUID === "local-123" ? "real-456" : "?" }) }),
    });
    expect(await createApi(fake.call).createNote("Test")).toBe("real-456");
  });

  it("keeps the local id if Amplenote cannot resolve it yet", async () => {
    const fake = fakeAmplenote({
      createNote: () => ({ noteUUID: "local-123" }),
      getNoteMetadata: () => {
        throw new Error("not found");
      },
    });
    expect(await createApi(fake.call).createNote("Test")).toBe("local-123");
  });
});

describe("waitForPermanentId", () => {
  it("returns as soon as Amplenote reports the permanent id", async () => {
    let lookups = 0;
    const fake = fakeAmplenote({
      getNoteMetadata: () => ({ note: aNote({ uuid: ++lookups < 3 ? "local-1" : "real-1" }) }),
    });
    const id = await createApi(fake.call).waitForPermanentId("local-1", { intervalMs: 1 });
    expect(id).toBe("real-1");
    expect(lookups).toBe(3);
  });

  it("gives up after the timeout and keeps the temporary id", async () => {
    const fake = fakeAmplenote({ getNoteMetadata: () => ({ note: aNote({ uuid: "local-1" }) }) });
    const id = await createApi(fake.call).waitForPermanentId("local-1", { intervalMs: 1, timeoutMs: 20 });
    expect(id).toBe("local-1");
  });

  it("does not poll for ids that are already permanent", async () => {
    const fake = fakeAmplenote({});
    expect(await createApi(fake.call).waitForPermanentId("real-1")).toBe("real-1");
    expect(fake.calls).toHaveLength(0);
  });
});
