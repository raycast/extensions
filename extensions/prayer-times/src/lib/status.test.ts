import { describe, expect, it } from "vitest";
import { PrayerSlot } from "./prayers";
import { MARK_TITLES, markOptions, parseStatus, prayedAt, STATUS_LABELS, statusOf, validStatus } from "./status";

const at = (h: number, m: number, day = 8) => new Date(2026, 9, day, h, m);
const asr: PrayerSlot = {
  id: "2026-10-08/asr",
  key: "asr",
  name: "Asr",
  date: "2026-10-08",
  start: at(16, 33),
  end: at(18, 12),
  late: at(18, 12),
  jamaat: at(16, 45),
};

describe("reading the status line", () => {
  it("reads values leniently and ignores unknown ones", () => {
    expect(parseStatus(" Jamaat ")).toBe("jamaat");
    expect(parseStatus("prayed")).toBeUndefined();
    expect(parseStatus(undefined)).toBeUndefined();
  });

  it("ignores a line that disagrees with the reminder", () => {
    expect(validStatus("jamaat", true)).toBe("jamaat");
    expect(validStatus("jamaat", false)).toBeUndefined();
    expect(validStatus("missed", false)).toBe("missed");
    expect(validStatus("missed", true)).toBeUndefined();
  });
});

describe("statusOf", () => {
  it("uses a valid written status", () => {
    expect(statusOf(asr, true, at(21, 0), "madeup", at(22, 0))).toBe("madeup");
    expect(statusOf(asr, false, undefined, "missed", at(17, 0))).toBe("missed");
  });

  it("falls back to the clock without a line or with a stale one", () => {
    expect(statusOf(asr, true, at(17, 0), undefined, at(22, 0))).toBe("ontime");
    expect(statusOf(asr, true, at(19, 0), "missed", at(22, 0))).toBe("late");
    expect(statusOf(asr, false, undefined, "jamaat", at(22, 0))).toBe("missed");
    expect(statusOf(asr, false, undefined, undefined, at(17, 0))).toBeUndefined();
  });
});

describe("prayedAt", () => {
  it("uses now while the prayer time is running", () => {
    expect(prayedAt(asr, "ontime", at(17, 0))).toEqual(at(17, 0));
  });

  it("back-dates on time to jamaat, or the start without one", () => {
    expect(prayedAt(asr, "ontime", at(21, 0))).toEqual(at(16, 45));
    expect(prayedAt({ ...asr, jamaat: undefined }, "ontime", at(21, 0))).toEqual(at(16, 33));
  });

  it("records late as the end of the prayer time, or now if later", () => {
    expect(prayedAt(asr, "late", at(17, 0))).toEqual(at(18, 12));
    expect(prayedAt(asr, "late", at(21, 0))).toEqual(at(21, 0));
  });

  it("records jamaat at the jamaat once it has happened, and made up at now", () => {
    expect(prayedAt(asr, "jamaat", at(21, 0))).toEqual(at(16, 45));
    expect(prayedAt(asr, "jamaat", at(16, 40))).toEqual(at(16, 40));
    expect(prayedAt(asr, "madeup", at(21, 0))).toEqual(at(21, 0));
  });
});

describe("markOptions", () => {
  it("offers late while on time (a plain mark is already on time), jamaat only after it", () => {
    expect(markOptions(asr, undefined, at(16, 40))).toEqual(["late"]);
    expect(markOptions(asr, undefined, at(17, 0))).toEqual(["jamaat", "late"]);
  });

  it("offers on time and made up once the time has ended", () => {
    expect(markOptions(asr, undefined, at(21, 0))).toEqual(["jamaat", "ontime", "madeup"]);
    expect(markOptions(asr, "missed", at(21, 0))).toEqual(["jamaat", "ontime", "madeup"]);
  });

  it("offers every other status for a prayed one", () => {
    expect(markOptions(asr, "ontime", at(17, 0))).toEqual(["jamaat", "late"]);
    expect(markOptions(asr, "jamaat", at(21, 0))).toEqual(["ontime", "late", "madeup"]);
  });
});

describe("labels", () => {
  it("calls only a made-up prayer qaza; late is still within its time", () => {
    expect(MARK_TITLES.late).toBe("Late");
    expect(MARK_TITLES.madeup).toBe("Made Up (Qaza)");
    expect(STATUS_LABELS.late).not.toMatch(/qaza/i);
    expect(STATUS_LABELS.madeup).toMatch(/qaza/i);
  });
});
