import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { scopeMetadata } from "../src/dates";

describe("Inspector scope display", () => {
  it("splits local timestamp ranges into readable date and exact time rows", () => {
    const range = "2026-09-10T02:00:41|2026-09-10T02:05:41";
    const rows = scopeMetadata(range, "en-US");
    assert.deepEqual(
      rows.map((row) => row.title),
      ["Scope", "Start", "End"],
    );
    assert.equal(rows[0].text, "Sep 10, 2026");
    assert.match(rows[1].text, /2:00:41/);
    assert.match(rows[2].text, /2:05:41/);
    assert.ok(
      rows.every((row) => !row.text.includes("|") && !row.text.includes("T02")),
    );
  });

  it("keeps cross-midnight and cross-year dates distinct", () => {
    const rows = scopeMetadata(
      "2026-12-31T23:59:00|2027-01-01T00:01:00",
      "en-US",
    );
    assert.deepEqual(
      rows.map((row) => row.title),
      ["Scope", "Start Date", "Start", "End Date", "End"],
    );
    assert.equal(rows[1].text, "Dec 31, 2026");
    assert.equal(rows[3].text, "Jan 1, 2027");
  });

  it("treats day-only and since filters as local calendar dates", () => {
    assert.deepEqual(scopeMetadata("before:2026-09-10", "en-US"), [
      { title: "Scope", text: "Before Sep 10, 2026" },
    ]);
    assert.equal(
      scopeMetadata("before:2026-09-10T12:00:00", "en-US")[1].title,
      "Before",
    );
    assert.deepEqual(scopeMetadata("2026-09-10", "en-US"), [
      { title: "Scope", text: "Sep 10, 2026" },
    ]);
    assert.deepEqual(scopeMetadata("since:2026-09-01", "en-US"), [
      { title: "Scope", text: "Since Sep 1, 2026" },
    ]);
    assert.deepEqual(scopeMetadata("2026-09-01|2026-09-10", "en-US"), [
      { title: "Scope", text: "Date range" },
      { title: "From", text: "Sep 1, 2026" },
      { title: "To", text: "Sep 10, 2026" },
    ]);
  });

  it("converts explicit offsets to the host timezone and handles invalid input", () => {
    const source = "2026-09-10T02:00:41Z";
    const time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
    assert.equal(
      scopeMetadata(source, "en-US")[1].text,
      time.format(new Date(source)),
    );
    assert.deepEqual(scopeMetadata("invalid", "en-US"), [
      { title: "Scope", text: "Unrecognized time range" },
    ]);
  });
});
