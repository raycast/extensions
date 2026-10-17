import { execFile } from "node:child_process";

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCalendarEvent as createCalendarEventNative,
  createReminder as createReminderNative,
  listWritableCalendarsJSON,
} from "swift:../../swift";

import {
  createAppleCalendarEvent,
  createAppleReminder,
  CreationOutcomeUnknownError,
  listWritableCalendars,
  openCalendarAtDate,
} from "../src/lib/apple-calendar";

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

const execFileMock = vi.mocked(execFile);
const createCalendarEventMock = vi.mocked(createCalendarEventNative);
const createReminderMock = vi.mocked(createReminderNative);
const listWritableCalendarsMock = vi.mocked(listWritableCalendarsJSON);

type ExecResult = { stdout: string; stderr: string };
type ExecCallback = (error: Error | null, result?: ExecResult) => void;

function getExecCallback(args: unknown[]): ExecCallback {
  const callback = args[args.length - 1];
  if (typeof callback !== "function") {
    throw new Error("execFile callback is missing");
  }
  return callback as ExecCallback;
}

describe("apple-calendar bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    process.env.PATH = "/usr/bin:/bin";
    process.env.HOME = "/Users/mock";
    process.env.TMPDIR = "/tmp";
    process.env.SECRET_TOKEN = "should-not-leak";
  });

  it("passes only allowlisted env and payload to osascript", async () => {
    execFileMock.mockImplementation((...args: unknown[]) => {
      getExecCallback(args)(null, { stdout: "", stderr: "" });
      return undefined as never;
    });

    await openCalendarAtDate(new Date(2026, 2, 21, 10, 30, 0, 0));

    expect(execFileMock).toHaveBeenCalledTimes(1);
    const [executable, commandArgs, options] = execFileMock.mock.calls[0] as unknown as [
      string,
      string[],
      { env: NodeJS.ProcessEnv; timeout: number },
    ];
    expect(executable).toBe("osascript");
    expect(commandArgs.slice(0, 3)).toEqual(["-l", "JavaScript", "-e"]);
    expect(options.env.SECRET_TOKEN).toBeUndefined();
    expect(options.env.PATH).toBe("/usr/bin:/bin");
    expect(options.env.RAYCAST_KOREAN_CALENDAR_OPEN_PAYLOAD).toBeDefined();
    expect(options.timeout).toBe(10_000);
  });

  it("maps the native calendar list and marks its default", async () => {
    listWritableCalendarsMock.mockResolvedValue(
      JSON.stringify({
        defaultCalendarIdentifier: "calendar-1",
        calendars: [
          { id: "calendar-1", title: "Work", sourceTitle: "iCloud" },
          { id: "calendar-2", title: "Personal", sourceTitle: "iCloud" },
        ],
      }),
    );

    await expect(listWritableCalendars()).resolves.toEqual({
      defaultCalendarIdentifier: "calendar-1",
      calendars: [
        { id: "calendar-1", title: "Work", sourceTitle: "iCloud", isDefault: true },
        { id: "calendar-2", title: "Personal", sourceTitle: "iCloud", isDefault: false },
      ],
    });
  });

  it("encodes calendar data for the native bridge", async () => {
    createCalendarEventMock.mockResolvedValue("Work");
    const start = new Date(2026, 2, 21, 10, 30, 0, 0);

    await expect(
      createAppleCalendarEvent(
        {
          title: "Meeting",
          start,
          end: new Date(start.getTime() + 30 * 60 * 1000),
          location: "B1 Meeting Room",
          allDay: false,
          source: "내일 오전 10시 30분 회의",
          intent: "event",
        },
        {
          preferredCalendarIdentifier: "calendar-1",
          recurrence: {
            frequency: "weekly",
            weekday: 6,
            end: { type: "count", count: 10 },
          },
        },
      ),
    ).resolves.toEqual({ calendarName: "Work" });

    const encodedPayload = createCalendarEventMock.mock.calls[0]?.[0];
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf8"));
    expect(payload).toMatchObject({
      title: "Meeting",
      location: "B1 Meeting Room",
      preferredCalendarIdentifier: "calendar-1",
      recurrence: {
        frequency: "weekly",
        interval: 1,
        weekday: 6,
        end: { type: "count", count: 10 },
      },
    });
  });

  it("stores a reminder location as notes", async () => {
    createReminderMock.mockResolvedValue("Tasks");
    const start = new Date(2026, 2, 21, 10, 30, 0, 0);

    await createAppleReminder(
      {
        title: "Send contract",
        start,
        end: start,
        location: "Office",
        allDay: false,
        source: "내일 오전 10시 30분까지 계약서 보내기",
        intent: "deadline",
      },
      { preferredReminderCalendarIdentifier: "reminders-1" },
    );

    const encodedPayload = createReminderMock.mock.calls[0]?.[0];
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf8"));
    expect(payload).toMatchObject({
      title: "Send contract",
      notes: "Location: Office",
      preferredReminderCalendarIdentifier: "reminders-1",
    });
  });

  it("adds System Settings guidance when calendar permission is denied", async () => {
    listWritableCalendarsMock.mockRejectedValue(
      Object.assign(new Error("Calendar permission denied"), { stderr: "Calendar permission denied" }),
    );

    await expect(listWritableCalendars()).rejects.toThrow(
      "Open System Settings > Privacy & Security > Calendars and allow Raycast access, then try again.",
    );
  });

  it("classifies a native creation timeout as an unknown outcome", async () => {
    vi.useFakeTimers();
    createCalendarEventMock.mockReturnValue(new Promise(() => undefined));
    const start = new Date(2026, 2, 21, 10, 30, 0, 0);
    const creation = createAppleCalendarEvent({
      title: "Meeting",
      start,
      end: new Date(start.getTime() + 60 * 60 * 1000),
      allDay: false,
      source: "내일 오전 10시 30분 회의",
      intent: "event",
    });
    const assertion = expect(creation).rejects.toBeInstanceOf(CreationOutcomeUnknownError);

    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });
});
