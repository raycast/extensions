import { describe, expect, it } from "vitest";
import { dailyJotName } from "../src/lib/api";
import { dayLabel, isHidden, taskGroup, taskReferenceCount, taskTitle } from "../src/lib/tasks";
import { aTask, secondsFromNow } from "./builders";

describe("dailyJotName", () => {
  it.each([
    ["2026-10-01", "October 1st, 2026"],
    ["2026-10-02", "October 2nd, 2026"],
    ["2026-10-03", "October 3rd, 2026"],
    ["2026-10-04", "October 4th, 2026"],
    ["2026-10-11", "October 11th, 2026"],
    ["2026-10-12", "October 12th, 2026"],
    ["2026-10-13", "October 13th, 2026"],
    ["2026-10-21", "October 21st, 2026"],
    ["2026-10-22", "October 22nd, 2026"],
    ["2026-10-23", "October 23rd, 2026"],
    ["2026-10-31", "October 31st, 2026"],
  ])("names %s like Amplenote does", (date, expected) => {
    expect(dailyJotName(new Date(`${date}T12:00:00`))).toBe(expected);
  });
});

describe("taskGroup", () => {
  it("puts tasks past their deadline in overdue", () => {
    expect(taskGroup(aTask({ deadline: secondsFromNow(-60) }))).toBe("overdue");
  });

  it("puts tasks starting today or earlier in today", () => {
    expect(taskGroup(aTask({ startAt: secondsFromNow(-3 * 86400) }))).toBe("today");
  });

  it("puts tasks due later today in today, using the given time", () => {
    const morning = Math.floor(new Date("2026-10-18T10:00:00").getTime() / 1000);
    const evening = Math.floor(new Date("2026-10-18T17:00:00").getTime() / 1000);
    expect(taskGroup(aTask({ deadline: evening }), morning)).toBe("today");
    expect(taskGroup(aTask({ deadline: evening + 86400 }), morning)).toBe("upcoming");
  });

  it("puts future start dates and future deadlines in upcoming", () => {
    expect(taskGroup(aTask({ startAt: secondsFromNow(3 * 86400) }))).toBe("upcoming");
    expect(taskGroup(aTask({ deadline: secondsFromNow(3 * 86400) }))).toBe("upcoming");
  });

  it("puts tasks without dates in unscheduled", () => {
    expect(taskGroup(aTask())).toBe("unscheduled");
  });
});

describe("isHidden", () => {
  it("hides tasks until their hide-until time", () => {
    expect(isHidden(aTask({ hideUntil: secondsFromNow(600) }))).toBe(true);
    expect(isHidden(aTask({ hideUntil: secondsFromNow(-600) }))).toBe(false);
  });
});

describe("taskTitle", () => {
  it("turns task Markdown into plain text", () => {
    expect(taskTitle("Review [the doc](https://x.y/z) **today** \\- ok")).toBe("Review the doc today - ok");
  });

  it("drops links to other tasks, which only show an id", () => {
    const content =
      "Update readme [60a401d1-69f7-42f3-be74-4adfbf4ec4e4](https://www.amplenote.com/notes/tasks/60a401d1-69f7-42f3-be74-4adfbf4ec4e4?relation=continuation)";
    expect(taskTitle(content)).toBe("Update readme");
    expect(taskReferenceCount(content)).toBe(1);
  });

  it("falls back for empty tasks", () => {
    expect(taskTitle(null)).toBe("Untitled task");
    expect(taskTitle("![img](a.png)")).toBe("Untitled task");
  });
});

describe("dayLabel", () => {
  it("names today and yesterday", () => {
    expect(dayLabel(secondsFromNow(0))).toBe("Today");
    expect(dayLabel(secondsFromNow(-86400))).toBe("Yesterday");
  });
});
