import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseBusyEvents } from "../src/lib/ics";
import { buildPlan, rangeFor } from "../src/lib/plan";
import { calendar, local, options, spans, stamp, TZID, vevent, VTIMEZONE } from "./helpers";

const FROM = local(2026, 11, 9);
const TO = local(2026, 11, 23);

function parse(...events: string[]) {
  return parseBusyEvents(calendar(VTIMEZONE, ...events), FROM, TO);
}

function timed(...extra: string[]): string {
  return vevent("UID:e1", `DTSTART;${TZID}:20261110T100000`, `DTEND;${TZID}:20261110T110000`, ...extra);
}

function kind(...extra: string[]): "busy" | "tentative" | "free" {
  const events = parse(timed(...extra));
  if (events.length === 0) return "free";
  assert.equal(events.length, 1);
  return events[0].tentative ? "tentative" : "busy";
}

describe("parseBusyEvents", () => {
  describe("times", () => {
    it("reads a timed event in its time zone", () => {
      const [e] = parse(timed());
      assert.equal(stamp(e.start), "2026-11-10 10:00");
      assert.equal(stamp(e.end), "2026-11-10 11:00");
      assert.equal(e.allDay, false);
      assert.equal(e.tentative, false);
    });

    it("converts UTC times to local time", () => {
      const [e] = parse(vevent("UID:u", "DTSTART:20261110T090000Z", "DTEND:20261110T100000Z"));
      assert.equal(stamp(e.start), "2026-11-10 10:00");
      assert.equal(stamp(e.end), "2026-11-10 11:00");
    });

    it("gives events without a duration one minute", () => {
      const [e] = parse(vevent("UID:z", "DTSTART:20261110T090000Z", "DTEND:20261110T090000Z"));
      assert.equal(e.end - e.start, 60 * 1000);
    });

    it("returns events sorted by start", () => {
      const events = parse(
        vevent("UID:b", "DTSTART:20261112T090000Z", "DTEND:20261112T100000Z"),
        vevent("UID:a", "DTSTART:20261110T090000Z", "DTEND:20261110T100000Z"),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-10 10:00", "2026-11-12 10:00"],
      );
    });

    it("returns nothing for a calendar without events", () => {
      assert.deepEqual(parse(), []);
    });

    it("throws on input that is not a calendar", () => {
      assert.throws(() => parseBusyEvents("<html>Sign in</html>", FROM, TO));
    });
  });

  describe("time zones without a definition in the feed", () => {
    const withoutDefinition = (...events: string[]) => parseBusyEvents(calendar(...events), FROM, TO);

    it("resolves IANA names", () => {
      const [e] = withoutDefinition(
        vevent(
          "UID:ny",
          "DTSTART;TZID=America/New_York:20261110T090000",
          "DTEND;TZID=America/New_York:20261110T100000",
        ),
      );
      assert.equal(stamp(e.start), "2026-11-10 15:00");
      assert.equal(stamp(e.end), "2026-11-10 16:00");
    });

    it("follows the daylight saving rules of the IANA zone", () => {
      const events = parseBusyEvents(
        calendar(
          vevent(
            "UID:ny",
            "RRULE:FREQ=WEEKLY;BYDAY=MO",
            "DTSTART;TZID=America/New_York:20261026T090000",
            "DTEND;TZID=America/New_York:20261026T100000",
          ),
        ),
        local(2026, 10, 26),
        local(2026, 11, 9),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-10-26 14:00", "2026-11-02 15:00"],
      );
    });

    it("resolves times around the local daylight saving change", () => {
      const events = parseBusyEvents(
        calendar(
          vevent("UID:a", "DTSTART;TZID=Europe/Berlin:20261025T013000", "DTEND;TZID=Europe/Berlin:20261025T033000"),
          vevent("UID:b", "DTSTART;TZID=Europe/Berlin:20260329T013000", "DTEND;TZID=Europe/Berlin:20260329T033000"),
        ),
        local(2026, 3, 1),
        local(2026, 11, 1),
      );
      assert.deepEqual(
        events.map((e) => `${stamp(e.start)} ${(e.end - e.start) / 3600000}h`),
        ["2026-03-29 01:30 1h", "2026-10-25 01:30 3h"],
      );
    });

    it("prefers the definition in the feed when there is one", () => {
      const shifted = [
        "BEGIN:VTIMEZONE",
        "TZID:Europe/Berlin",
        "BEGIN:STANDARD",
        "DTSTART:16010101T000000",
        "TZOFFSETFROM:+0500",
        "TZOFFSETTO:+0500",
        "END:STANDARD",
        "END:VTIMEZONE",
      ].join("\r\n");
      const [e] = parseBusyEvents(
        calendar(
          shifted,
          vevent("UID:x", "DTSTART;TZID=Europe/Berlin:20261110T120000", "DTEND;TZID=Europe/Berlin:20261110T130000"),
        ),
        FROM,
        TO,
      );
      assert.equal(stamp(e.start), "2026-11-10 08:00");
    });

    it("reads unknown names as local time", () => {
      const events = withoutDefinition(
        vevent(
          "UID:w",
          "DTSTART;TZID=Eastern Standard Time:20261110T090000",
          "DTEND;TZID=Eastern Standard Time:20261110T100000",
        ),
        vevent("UID:c", "DTSTART;TZID=Not/AZone:20261111T090000", "DTEND;TZID=Not/AZone:20261111T100000"),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-10 09:00", "2026-11-11 09:00"],
      );
    });
  });

  describe("range", () => {
    it("skips events outside the range", () => {
      const events = parse(
        vevent("UID:before", "DTSTART:20261106T090000Z", "DTEND:20261106T100000Z"),
        vevent("UID:after", "DTSTART:20261123T090000Z", "DTEND:20261123T100000Z"),
      );
      assert.deepEqual(events, []);
    });

    it("keeps events that reach into the range", () => {
      const events = parse(vevent("UID:edge", "DTSTART:20261108T200000Z", "DTEND:20261109T080000Z"));
      assert.equal(events.length, 1);
    });
  });

  describe("availability", () => {
    it("treats events without any status as busy", () => {
      assert.equal(kind(), "busy");
    });

    it("reads the standard fields", () => {
      assert.equal(kind("TRANSP:OPAQUE"), "busy");
      assert.equal(kind("TRANSP:TRANSPARENT"), "free");
      assert.equal(kind("STATUS:CONFIRMED"), "busy");
      assert.equal(kind("STATUS:TENTATIVE"), "tentative");
      assert.equal(kind("STATUS:CANCELLED"), "free");
    });

    it("lets a transparent event win over a tentative status", () => {
      assert.equal(kind("TRANSP:TRANSPARENT", "STATUS:TENTATIVE"), "free");
    });

    it("reads the Outlook busy status", () => {
      assert.equal(kind("X-MICROSOFT-CDO-BUSYSTATUS:BUSY"), "busy");
      assert.equal(kind("X-MICROSOFT-CDO-BUSYSTATUS:OOF"), "busy");
      assert.equal(kind("X-MICROSOFT-CDO-BUSYSTATUS:TENTATIVE"), "tentative");
      assert.equal(kind("X-MICROSOFT-CDO-BUSYSTATUS:FREE"), "free");
      assert.equal(kind("X-MICROSOFT-CDO-BUSYSTATUS:WORKINGELSEWHERE"), "free");
    });

    it("prefers the Outlook busy status over the standard fields", () => {
      assert.equal(kind("X-MICROSOFT-CDO-BUSYSTATUS:BUSY", "TRANSP:TRANSPARENT"), "busy");
      assert.equal(kind("X-MICROSOFT-CDO-BUSYSTATUS:FREE", "TRANSP:OPAQUE"), "free");
      assert.equal(kind("X-MICROSOFT-CDO-BUSYSTATUS:BUSY", "STATUS:TENTATIVE"), "busy");
    });

    it("drops cancelled events even when Outlook marks them busy", () => {
      assert.equal(kind("X-MICROSOFT-CDO-BUSYSTATUS:BUSY", "STATUS:CANCELLED"), "free");
    });

    it("ignores the case of the values", () => {
      assert.equal(kind("TRANSP:transparent"), "free");
      assert.equal(kind("X-MICROSOFT-CDO-BUSYSTATUS:Tentative"), "tentative");
    });
  });

  describe("all-day events", () => {
    it("covers the local calendar day", () => {
      const [e] = parse(vevent("UID:d", "DTSTART;VALUE=DATE:20261119", "DTEND;VALUE=DATE:20261120"));
      assert.equal(e.allDay, true);
      assert.equal(stamp(e.start), "2026-11-19 00:00");
      assert.equal(stamp(e.end), "2026-11-20 00:00");
    });

    it("covers several days", () => {
      const [e] = parse(vevent("UID:d", "DTSTART;VALUE=DATE:20261116", "DTEND;VALUE=DATE:20261119"));
      assert.equal(stamp(e.start), "2026-11-16 00:00");
      assert.equal(stamp(e.end), "2026-11-19 00:00");
    });

    it("lasts one day when the end is missing", () => {
      const [e] = parse(vevent("UID:d", "DTSTART;VALUE=DATE:20261119"));
      assert.equal(stamp(e.start), "2026-11-19 00:00");
      assert.equal(stamp(e.end), "2026-11-20 00:00");
    });

    it("follows the availability rules", () => {
      const day = ["DTSTART;VALUE=DATE:20261119", "DTEND;VALUE=DATE:20261120"];
      assert.equal(parse(vevent("UID:d", ...day, "TRANSP:TRANSPARENT")).length, 0);
      assert.equal(parse(vevent("UID:d", ...day, "X-MICROSOFT-CDO-BUSYSTATUS:FREE")).length, 0);
      assert.equal(parse(vevent("UID:d", ...day, "X-MICROSOFT-CDO-BUSYSTATUS:OOF")).length, 1);
      assert.equal(parse(vevent("UID:d", ...day, "X-MICROSOFT-CDO-BUSYSTATUS:TENTATIVE"))[0].tentative, true);
    });
  });

  describe("recurring events", () => {
    const weekly = [
      "UID:series",
      "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
      `DTSTART;${TZID}:20250106T093000`,
      `DTEND;${TZID}:20250106T100000`,
    ];

    it("expands a series within the range", () => {
      const events = parse(vevent(...weekly));
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        [
          "2026-11-09 09:30",
          "2026-11-11 09:30",
          "2026-11-13 09:30",
          "2026-11-16 09:30",
          "2026-11-18 09:30",
          "2026-11-20 09:30",
        ],
      );
      assert.ok(events.every((e) => e.end - e.start === 30 * 60 * 1000));
    });

    it("stops at the end of a series", () => {
      const events = parse(
        vevent(
          "UID:series",
          "RRULE:FREQ=DAILY;UNTIL=20261111T235959Z",
          "DTSTART:20261109T090000Z",
          "DTEND:20261109T100000Z",
        ),
      );
      assert.equal(events.length, 3);
    });

    it("skips excluded dates", () => {
      const events = parse(vevent(...weekly, `EXDATE;${TZID}:20261113T093000`));
      assert.equal(events.length, 5);
      assert.ok(!events.some((e) => stamp(e.start) === "2026-11-13 09:30"));
    });

    it("moves an occurrence that has an exception", () => {
      const events = parse(
        vevent(...weekly),
        vevent(
          "UID:series",
          `RECURRENCE-ID;${TZID}:20261118T093000`,
          `DTSTART;${TZID}:20261118T140000`,
          `DTEND;${TZID}:20261118T150000`,
        ),
      );
      const starts = events.map((e) => stamp(e.start));
      assert.equal(events.length, 6);
      assert.ok(starts.includes("2026-11-18 14:00"));
      assert.ok(!starts.includes("2026-11-18 09:30"));
    });

    it("drops only the cancelled occurrence of a series", () => {
      const events = parse(
        vevent(...weekly),
        vevent(
          "UID:series",
          `RECURRENCE-ID;${TZID}:20261118T093000`,
          `DTSTART;${TZID}:20261118T093000`,
          `DTEND;${TZID}:20261118T100000`,
          "STATUS:CANCELLED",
        ),
      );
      assert.equal(events.length, 5);
      assert.ok(!events.some((e) => stamp(e.start).startsWith("2026-11-18")));
    });

    it("uses the availability of the exception for that occurrence", () => {
      const events = parse(
        vevent(...weekly, "X-MICROSOFT-CDO-BUSYSTATUS:BUSY"),
        vevent(
          "UID:series",
          `RECURRENCE-ID;${TZID}:20261118T093000`,
          `DTSTART;${TZID}:20261118T093000`,
          `DTEND;${TZID}:20261118T100000`,
          "X-MICROSOFT-CDO-BUSYSTATUS:TENTATIVE",
        ),
      );
      assert.deepEqual(
        events.filter((e) => e.tentative).map((e) => stamp(e.start)),
        ["2026-11-18 09:30"],
      );
    });

    it("treats an exception without its series as a single event", () => {
      const events = parse(
        vevent(
          "UID:orphan",
          `RECURRENCE-ID;${TZID}:20261118T093000`,
          `DTSTART;${TZID}:20261118T140000`,
          `DTEND;${TZID}:20261118T150000`,
        ),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-18 14:00"],
      );
    });

    it("includes an occurrence that was moved into the range from after its end", () => {
      const events = parse(
        vevent(
          "UID:tue",
          "RRULE:FREQ=WEEKLY;BYDAY=TU",
          `DTSTART;${TZID}:20261103T100000`,
          `DTEND;${TZID}:20261103T110000`,
        ),
        vevent(
          "UID:tue",
          `RECURRENCE-ID;${TZID}:20261124T100000`,
          `DTSTART;${TZID}:20261112T100000`,
          `DTEND;${TZID}:20261112T110000`,
        ),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-10 10:00", "2026-11-12 10:00", "2026-11-17 10:00"],
      );
    });

    it("includes an occurrence that was moved into the range from before its start", () => {
      const events = parse(
        vevent(
          "UID:tue",
          "RRULE:FREQ=WEEKLY;BYDAY=TU",
          `DTSTART;${TZID}:20261027T100000`,
          `DTEND;${TZID}:20261027T110000`,
        ),
        vevent(
          "UID:tue",
          `RECURRENCE-ID;${TZID}:20261103T100000`,
          `DTSTART;${TZID}:20261112T100000`,
          `DTEND;${TZID}:20261112T110000`,
        ),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-10 10:00", "2026-11-12 10:00", "2026-11-17 10:00"],
      );
    });

    it("does not duplicate an occurrence that was moved within the range", () => {
      const events = parse(
        vevent(
          "UID:tue",
          "RRULE:FREQ=WEEKLY;BYDAY=TU",
          `DTSTART;${TZID}:20261103T100000`,
          `DTEND;${TZID}:20261103T110000`,
        ),
        vevent(
          "UID:tue",
          `RECURRENCE-ID;${TZID}:20261117T100000`,
          `DTSTART;${TZID}:20261112T100000`,
          `DTEND;${TZID}:20261112T110000`,
        ),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-10 10:00", "2026-11-12 10:00"],
      );
    });

    it("includes the first date of a series that only lists additional dates", () => {
      const events = parse(
        vevent(
          "UID:r",
          "DTSTART:20261110T090000Z",
          "DTEND:20261110T100000Z",
          "RDATE:20261111T090000Z,20261113T090000Z",
        ),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-10 10:00", "2026-11-11 10:00", "2026-11-13 10:00"],
      );
    });

    it("leaves out an excluded first date of a series that only lists additional dates", () => {
      const events = parse(
        vevent(
          "UID:r",
          "DTSTART:20261110T090000Z",
          "DTEND:20261110T100000Z",
          "RDATE:20261111T090000Z",
          "EXDATE:20261110T090000Z",
        ),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-11 10:00"],
      );
    });

    it("does not duplicate the first date of a series with a rule and additional dates", () => {
      const events = parse(
        vevent(
          "UID:r",
          "RRULE:FREQ=WEEKLY;BYDAY=TU",
          "DTSTART:20261110T090000Z",
          "DTEND:20261110T100000Z",
          "RDATE:20261112T090000Z",
        ),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-10 10:00", "2026-11-12 10:00", "2026-11-17 10:00"],
      );
    });

    it("keeps every series when two of them share a UID", () => {
      const events = parseBusyEvents(
        calendar(
          vevent("UID:dup", "RRULE:FREQ=WEEKLY;BYDAY=MO", "DTSTART:20261102T090000Z", "DTEND:20261102T100000Z"),
          vevent("UID:dup", "RRULE:FREQ=WEEKLY;BYDAY=WE", "DTSTART:20261104T090000Z", "DTEND:20261104T100000Z"),
        ),
        FROM,
        local(2026, 11, 16),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-09 10:00", "2026-11-11 10:00"],
      );
    });

    it("applies an exception once when two series share its UID", () => {
      const events = parseBusyEvents(
        calendar(
          vevent("UID:dup", "RRULE:FREQ=WEEKLY;BYDAY=MO", "DTSTART:20261102T090000Z", "DTEND:20261102T100000Z"),
          vevent("UID:dup", "RRULE:FREQ=WEEKLY;BYDAY=WE", "DTSTART:20261104T090000Z", "DTEND:20261104T100000Z"),
          vevent("UID:dup", "RECURRENCE-ID:20261123T090000Z", "DTSTART:20261112T090000Z", "DTEND:20261112T100000Z"),
        ),
        FROM,
        local(2026, 11, 16),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-09 10:00", "2026-11-11 10:00", "2026-11-12 10:00"],
      );
    });

    it("keeps the local time across the end of daylight saving time", () => {
      const events = parseBusyEvents(
        calendar(
          VTIMEZONE,
          vevent(
            "UID:dst",
            "RRULE:FREQ=WEEKLY;BYDAY=MO",
            `DTSTART;${TZID}:20261019T093000`,
            `DTEND;${TZID}:20261019T100000`,
          ),
        ),
        local(2026, 10, 19),
        local(2026, 11, 2),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-10-19 09:30", "2026-10-26 09:30"],
      );
    });

    it("repeats all-day events", () => {
      const events = parse(
        vevent("UID:d", "RRULE:FREQ=WEEKLY", "DTSTART;VALUE=DATE:20261103", "DTEND;VALUE=DATE:20261104"),
      );
      assert.deepEqual(
        events.map((e) => stamp(e.start)),
        ["2026-11-10 00:00", "2026-11-17 00:00"],
      );
      assert.ok(events.every((e) => e.allDay));
    });
  });
});

describe("sample calendar", () => {
  it("produces the expected free slots", () => {
    const ics = readFileSync(join(process.cwd(), "test", "sample.ics"), "utf8");
    const now = new Date("2026-11-10T10:20:00+01:00");
    const opts = options({ weeks: 2 });
    const { start, end } = rangeFor(now, opts);
    const weeks = buildPlan(parseBusyEvents(ics, start, end), now, opts);

    assert.deepEqual(
      weeks.map((week) => week.map((day) => spans(day.free))),
      [
        [
          [],
          ["10:30-13:00", "15:30-18:00"],
          ["08:00-09:30", "10:00-15:00", "16:30-18:00"],
          ["08:00-14:00", "17:00-18:00"],
          ["08:00-18:00"],
        ],
        [
          ["08:00-09:30", "10:00-18:00"],
          ["08:00-11:00", "12:30-18:00"],
          ["08:00-14:00", "15:00-18:00"],
          [],
          ["08:00-09:30", "10:00-18:00"],
        ],
      ],
    );
    assert.deepEqual(spans(weeks[0][2].tentative), ["15:00-16:30"]);
  });
});
