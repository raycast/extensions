import { describe, expect, it } from "vitest";
import { toAnnouncement } from "../../src/lib/forum";
import { toNotification } from "../../src/lib/notifications";
import { mergeEvents, toCalendarEvent } from "../../src/lib/calendar";

describe("toAnnouncement", () => {
  it("builds a markdown announcement with a discussion URL", () => {
    const announcement = toAnnouncement(
      {
        id: 220685,
        discussion: 194785,
        name: "calendar change",
        subject: "calendar change",
        message: "<p>The calendar has <b>changed</b>.<br />See you.</p>",
        userfullname: "Teacher Name",
        created: 1789448342,
        timemodified: 1789448342,
        attachments: [{ filename: "a.pdf", fileurl: "https://webeep.polimi.it/webservice/pluginfile.php/1/a.pdf" }],
      },
      { id: 42, name: "COMPILERS" },
    );
    expect(announcement.url).toBe("https://webeep.polimi.it/mod/forum/discuss.php?d=194785");
    expect(announcement.message).toBe("The calendar has **changed**.\nSee you.");
    expect(announcement.preview).toBe("The calendar has changed. See you.");
    expect(announcement.courseName).toBe("COMPILERS");
    expect(announcement.attachments).toHaveLength(1);
  });
});

describe("toNotification", () => {
  it("prefers the plain full message and keeps the context URL", () => {
    const n = toNotification({
      id: 1,
      subject: "New content in <b>DB2</b>",
      smallmessage: "Short text",
      fullmessage: "Line one\nLine two",
      fullmessagehtml: "<div>ignored</div>",
      contexturl: "https://webeep.polimi.it/mod/folder/view.php?id=1",
      contexturlname: "Folder",
      timecreated: 1789400435,
      read: false,
      eventtype: "newcontent",
    });
    expect(n.subject).toBe("New content in DB2");
    expect(n.message).toBe("Line one\nLine two");
    expect(n.preview).toBe("Short text");
    expect(n.url).toBe("https://webeep.polimi.it/mod/folder/view.php?id=1");
    expect(n.read).toBe(false);
    expect(n.kind).toBe("newcontent");
  });

  it("falls back to the HTML body", () => {
    const n = toNotification({
      id: 2,
      subject: "S",
      fullmessagehtml: "<p>Only <i>html</i></p>",
      timecreated: 1,
      read: true,
    });
    expect(n.message).toBe("Only html");
    expect(n.preview).toBe("Only html");
  });
});

describe("calendar", () => {
  const raw = (id: number, timestart: number) => ({
    id,
    name: "{mlang it}Consegna{mlang}{mlang en}Submission{mlang}",
    timestart,
    timeduration: 3600,
    eventtype: "due",
    modulename: "assign",
    url: `https://webeep.polimi.it/mod/assign/view.php?id=${id}`,
    course: { id: 7, fullname: "059429 - HCI (X) [2023-24]" },
    action: { name: "Add submission", url: "https://webeep.polimi.it/x", actionable: true },
  });

  it("maps a raw event", () => {
    const event = toCalendarEvent(raw(1, 1702072800), "en");
    expect(event.name).toBe("Submission");
    expect(event.end?.getTime()).toBe((1702072800 + 3600) * 1000);
    expect(event.courseName).toBe("059429 - HCI (X) [2023-24]");
    expect(event.actionName).toBe("Add submission");
  });

  it("merges lists without duplicates, sorted by start", () => {
    const events = mergeEvents(
      [
        [raw(1, 200), raw(2, 100)],
        [raw(2, 100), raw(3, 150)],
      ],
      "en",
    );
    expect(events.map((e) => e.id)).toEqual([2, 3, 1]);
  });
});
