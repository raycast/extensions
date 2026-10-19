import { describe, expect, it, vi } from "vitest";
import { AmplenoteApi, createApi } from "../src/lib/api";
import { aNote, aTask, fakeAmplenote } from "./builders";

const state = vi.hoisted(() => ({ api: undefined as unknown as AmplenoteApi }));

vi.mock("../src/lib/amplenote", () => ({
  get amplenote() {
    return state.api;
  },
  dailyJotTag: "daily-jots",
  isDailyJot: (note: { tags: string[] }) => note.tags.includes("daily-jots"),
}));

const { default: addTask, confirmation: addTaskConfirmation } = await import("../src/tools/add-task");
const { default: updateTask, confirmation: updateTaskConfirmation } = await import("../src/tools/update-task");

const inbox = aNote({ name: "Inbox" });
const seconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

function useInbox() {
  const fake = fakeAmplenote({
    filterNotes: () => ({ notes: [inbox] }),
    insertTask: () => ({ taskUUID: "new" }),
    getTaskDomains: () => ({ taskDomains: [] }),
  });
  state.api = createApi(fake.call);
  return fake;
}

const insertedTask = (fake: ReturnType<typeof fakeAmplenote>) =>
  (fake.callsTo("insertTask")[0].args as { task: Record<string, unknown> }).task;

describe("add-task repeat", () => {
  it("creates a repeating task on a fixed schedule, starting on the first matching day", async () => {
    const fake = useInbox();

    // Saturday start, Monday rule → first occurrence is the following Monday at 08:30.
    await addTask({
      content: "Water the plants",
      noteName: "Inbox",
      startDate: "2026-10-24T08:30",
      repeat: "FREQ=WEEKLY;BYDAY=MO",
    });

    expect(insertedTask(fake)).toMatchObject({
      isRepeating: true,
      repeat: "DTSTART:20261026T083000\nRRULE:FREQ=WEEKLY;BYDAY=MO",
      startAt: seconds("2026-10-26T08:30:00"),
    });
  });

  it("needs a start date for a repeating task", async () => {
    useInbox();
    await expect(addTask({ content: "x", noteName: "Inbox", repeat: "FREQ=DAILY" })).rejects.toThrow(/startDate/);
  });

  it("explains rules Amplenote can't store", async () => {
    useInbox();
    await expect(
      addTask({ content: "x", noteName: "Inbox", startDate: "2026-10-24", repeat: "2 days after complete" }),
    ).rejects.toThrow(/RRULE/);
  });

  it("shows the schedule in plain words in the confirmation", async () => {
    const result = await addTaskConfirmation({
      content: "Water the plants",
      startDate: "2026-10-26T08:30",
      repeat: "FREQ=WEEKLY;BYDAY=MO",
    });
    expect(result?.info).toContainEqual({ name: "Repeats", value: "Every week on Monday at 08:30" });
  });
});

describe("add-task hide until", () => {
  it("hides a one-off task until the start of the chosen day", async () => {
    const fake = useInbox();

    await addTask({ content: "Renew passport", noteName: "Inbox", startDate: "2026-10-22T09:00", hideUntil: "1-week" });

    expect(insertedTask(fake)).toMatchObject({ isRepeating: false, hideUntil: seconds("2026-10-15T00:00:00") });
  });

  it("needs a start date to hide a task relative to it", async () => {
    useInbox();
    await expect(addTask({ content: "x", noteName: "Inbox", hideUntil: "1-day" })).rejects.toThrow(/startDate/);
  });

  it("is refused for repeating tasks, because Amplenote only applies it to the first occurrence", async () => {
    useInbox();
    await expect(
      addTask({ content: "x", noteName: "Inbox", startDate: "2026-10-22", repeat: "FREQ=DAILY", hideUntil: "1-day" }),
    ).rejects.toThrow(/first occurrence/);
  });
});

describe("update-task repeat", () => {
  it("makes an existing task repeat, anchored at its start", async () => {
    const task = aTask({ uuid: "t1", startAt: seconds("2026-10-22T09:00:00") });
    const fake = fakeAmplenote({ getTask: () => ({ task }), updateTask: () => ({ success: true }) });
    state.api = createApi(fake.call);

    await updateTask({ taskUUID: "t1", repeat: "FREQ=WEEKLY" });

    expect(fake.callsTo("updateTask")[0].args.updates).toEqual({
      isRepeating: true,
      repeat: "DTSTART:20261022T090000\nRRULE:FREQ=WEEKLY",
    });
  });

  it("needs a start date to repeat", async () => {
    const fake = fakeAmplenote({ getTask: () => ({ task: aTask({ uuid: "t1", startAt: null }) }) });
    state.api = createApi(fake.call);
    await expect(updateTask({ taskUUID: "t1", repeat: "FREQ=WEEKLY" })).rejects.toThrow(/start date/);
  });
});

describe("review fixes for the tools", () => {
  it("shows the moved first occurrence in the confirmation, not the requested start", async () => {
    const result = await addTaskConfirmation({
      content: "Water the plants",
      startDate: "2026-10-24T08:30",
      repeat: "FREQ=WEEKLY;BYDAY=MO",
    });
    expect(result?.info).toContainEqual({ name: "Start", value: "Mon, Oct 26, 08:30" });
  });

  it("refuses hideUntil on a task that already repeats", async () => {
    const task = aTask({ uuid: "t1", startAt: seconds("2026-10-22T09:00:00"), isRepeating: true });
    state.api = createApi(fakeAmplenote({ getTask: () => ({ task }), updateTask: () => ({}) }).call);
    await expect(updateTask({ taskUUID: "t1", hideUntil: "1-day" })).rejects.toThrow(/first occurrence/);
  });

  it("refuses clearing the start while setting a repeat", async () => {
    const task = aTask({ uuid: "t1", startAt: seconds("2026-10-22T09:00:00") });
    state.api = createApi(fakeAmplenote({ getTask: () => ({ task }), updateTask: () => ({}) }).call);
    await expect(updateTask({ taskUUID: "t1", startDate: "", repeat: "FREQ=DAILY" })).rejects.toThrow(/start/);
  });

  it("re-anchors the repeat rule when the start of a repeating task moves", async () => {
    const task = aTask({
      uuid: "t1",
      startAt: seconds("2026-10-22T09:00:00"),
      isRepeating: true,
      repeat: "DTSTART:20261022T090000\nRRULE:FREQ=WEEKLY",
    });
    const fake = fakeAmplenote({ getTask: () => ({ task }), updateTask: () => ({ success: true }) });
    state.api = createApi(fake.call);

    await updateTask({ taskUUID: "t1", startDate: "2026-10-27T07:00" });

    expect(fake.callsTo("updateTask")[0].args.updates).toEqual({
      startAt: seconds("2026-10-27T07:00:00"),
      repeat: "DTSTART:20261027T070000\nRRULE:FREQ=WEEKLY",
    });
  });

  it("confirms the schedule for update-task in plain words", async () => {
    const task = aTask({ uuid: "t1", startAt: seconds("2026-10-22T09:00:00") });
    state.api = createApi(fakeAmplenote({ getTask: () => ({ task }) }).call);
    const result = await updateTaskConfirmation({ taskUUID: "t1", repeat: "FREQ=WEEKLY" });
    expect(result?.info).toContainEqual({ name: "Repeats", value: "Every week on Thursday at 09:00" });
  });
});

describe("update-task with rules made in Amplenote", () => {
  it("moves the start of a repeating task even if its rule uses parts the extension can't create", async () => {
    const task = aTask({
      uuid: "t1",
      startAt: seconds("2026-10-30T09:00:00"),
      isRepeating: true,
      repeat: "DTSTART:20261002T090000\nRRULE:FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1",
    });
    const fake = fakeAmplenote({ getTask: () => ({ task }), updateTask: () => ({ success: true }) });
    state.api = createApi(fake.call);

    await updateTask({ taskUUID: "t1", startDate: "2026-11-27T07:00" });

    expect(fake.callsTo("updateTask")[0].args.updates).toEqual({
      startAt: seconds("2026-11-27T07:00:00"),
      repeat: "DTSTART:20261127T070000\nRRULE:FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1",
    });
  });

  it("confirms the start that will actually be saved for a repeating task", async () => {
    const task = aTask({
      uuid: "t1",
      startAt: seconds("2026-10-26T08:30:00"),
      isRepeating: true,
      repeat: "DTSTART:20261026T083000\nRRULE:FREQ=WEEKLY;BYDAY=MO",
    });
    state.api = createApi(fakeAmplenote({ getTask: () => ({ task }) }).call);
    const result = await updateTaskConfirmation({ taskUUID: "t1", startDate: "2026-10-31T08:30" });
    expect(result?.info).toContainEqual({ name: "Start", value: "Sat, Oct 31, 08:30" });
  });
});
