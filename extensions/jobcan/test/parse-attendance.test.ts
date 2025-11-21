import { test } from "node:test";
import * as assert from "node:assert";
import { readFileSync } from "fs";
import { join } from "path";
import { parseAttendanceHtml } from "../src/lib/parse-attendance";

const fixturesDir = join(__dirname, "fixtures");

/**
 * Load fixture HTML
 */
function loadFixture(name: string): string {
  const filePath = join(fixturesDir, `${name}.html`);
  return readFileSync(filePath, "utf-8");
}


test("Extract list of attendance items from HTML", () => {
  const html = loadFixture("attendance-previous");
  const result = parseAttendanceHtml(html, 2025, 10);
  assert.ok(result.entries.length > 0, "Should extract at least one attendance row");
  assert.ok(result.entries.length >= 31, "Previous month should have at least 31 days");
});

test("Normal workday with clock-in/out (10/01)", () => {
  const html = loadFixture("attendance-previous");
  const result = parseAttendanceHtml(html, 2025, 10);
  
  // Find entry for 10/01
  const entry0101 = result.entries.find((e) => e.date === "2025-10-01");
  
  assert.ok(entry0101, "Should find entry for 10/01");
  assert.strictEqual(entry0101.clockIn, "10:00", "Clock-in should be 10:00");
  assert.strictEqual(entry0101.clockOut, "19:00", "Clock-out should be 19:00");
  assert.strictEqual(entry0101.workingHours, "08:00", "Working hours should be 08:00");
  assert.strictEqual(entry0101.shiftTime, "11:00～15:00", "Shift time should be 11:00～15:00");
  assert.strictEqual(entry0101.rawStatus.length, 0, "Should have no raw status for normal workday");
  assert.ok(entry0101.isLogged, "Should be logged");
});

test("Paid vacation (10/02 with PV status)", () => {
  const html = loadFixture("attendance-previous");
  const result = parseAttendanceHtml(html, 2025, 10);
  
  const entry0102 = result.entries.find((e) => e.date === "2025-10-02");
  
  assert.ok(entry0102, "Should find entry for 10/02");
  assert.strictEqual(entry0102.clockIn, undefined, "Clock-in should be empty for paid vacation");
  assert.strictEqual(entry0102.clockOut, undefined, "Clock-out should be empty for paid vacation");
  assert.ok(entry0102.rawStatus.includes("PV"), "Raw status should contain PV");
  assert.strictEqual(entry0102.status, "paid_vacation", "Status should be paid_vacation");
  assert.ok(entry0102.statusTooltip?.includes("有休"), "Tooltip should mention paid vacation");
});

test("Holiday work (10/25 with National holiday type and clock-in/out)", () => {
  const html = loadFixture("attendance-previous");
  const result = parseAttendanceHtml(html, 2025, 10);
  
  const entry1025 = result.entries.find((e) => e.date === "2025-10-25");
  
  assert.ok(entry1025, "Should find entry for 10/25");
  assert.strictEqual(entry1025.holidayType, "National", "Holiday type should be National");
  assert.strictEqual(entry1025.clockIn, "09:00", "Should have clock-in for holiday work");
  assert.strictEqual(entry1025.clockOut, "18:00", "Should have clock-out for holiday work");
});

test("Absence (11/04 with 'A' status)", () => {
  const html = loadFixture("attendance-current");
  const result = parseAttendanceHtml(html, 2025, 11);
  
  const entry1104 = result.entries.find((e) => e.date === "2025-11-04");
  
  assert.ok(entry1104, "Should find entry for 11/04");
  assert.strictEqual(entry1104.clockIn, undefined, "Clock-in should be empty for absence");
  assert.strictEqual(entry1104.clockOut, undefined, "Clock-out should be empty for absence");
  assert.ok(entry1104.rawStatus.includes("A"), "Raw status should contain A for absence");
  assert.strictEqual(entry1104.status, "absence", "Status should be absence");
});

test("Late (11/21 with 'L' status)", () => {
  const html = loadFixture("attendance-current");
  const result = parseAttendanceHtml(html, 2025, 11);
  
  const entry1121 = result.entries.find((e) => e.date === "2025-11-21");
  
  assert.ok(entry1121, "Should find entry for 11/21");
  assert.ok(entry1121.rawStatus.includes("L"), "Raw status should contain L for late");
  assert.strictEqual(entry1121.status, "late", "Status should be late");
});

test("Holiday (no work) - 10/04 with National holiday type", () => {
  const html = loadFixture("attendance-previous");
  const result = parseAttendanceHtml(html, 2025, 10);
  
  const entry1004 = result.entries.find((e) => e.date === "2025-10-04");
  
  assert.ok(entry1004, "Should find entry for 10/04");
  assert.strictEqual(entry1004.holidayType, "National", "Holiday type should be National");
  assert.strictEqual(entry1004.clockIn, undefined, "Clock-in should be empty for holiday");
  assert.strictEqual(entry1004.clockOut, undefined, "Clock-out should be empty for holiday");
});

test("Substitution holiday (10/31 with 'SH' status)", () => {
  const html = loadFixture("attendance-previous");
  const result = parseAttendanceHtml(html, 2025, 10);
  
  const entry1031 = result.entries.find((e) => e.date === "2025-10-31");
  
  assert.ok(entry1031, "Should find entry for 10/31");
  assert.ok(entry1031.rawStatus.includes("SH"), "Raw status should contain SH for substitution holiday");
  assert.strictEqual(entry1031.status, "substitution_holiday", "Status should be substitution_holiday");
  assert.ok(entry1031.statusTooltip?.includes("代休"), "Tooltip should mention substitution holiday");
});

test("Pending row (11/01 with jbc-table-warning class)", () => {
  const html = loadFixture("attendance-current");
  const result = parseAttendanceHtml(html, 2025, 11);
  
  const entry1101 = result.entries.find((e) => e.date === "2025-11-01");
  
  assert.ok(entry1101, "Should find entry for 11/01");
  assert.strictEqual(entry1101.status, "pending", "Status should be pending");
  assert.strictEqual(entry1101.holidayType, "National", "Should be a National holiday");
});

test("Unrecognized attendance patterns are logged", async () => {
  const originalDebug = console.debug;
  const debugCalls: unknown[] = [];
  
  // Mock console.debug
  console.debug = (...args: unknown[]) => {
    debugCalls.push(args);
    originalDebug(...args);
  };
  
  try {
    // Create a test HTML with unknown status code
    const testHtml = `
      <html>
        <body>
          <main>
            <div class="jbc-container">
              <div class="card">
                <div class="card-body">
                  <div id="search-result">
                    <div class="table-responsive">
                      <table class="table jbc-table text-center">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Holiday Type</th>
                            <th>Shift Time</th>
                            <th>Clock-in</th>
                            <th>Clock-out</th>
                            <th>Working Hours</th>
                            <th>Off-shift</th>
                            <th>Overtime</th>
                            <th>Night Shift</th>
                            <th>Break</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><a>11/99(Mon)</a></td>
                            <td></td>
                            <td>11:00～15:00</td>
                            <td>10:00</td>
                            <td>19:00</td>
                            <td>08:00</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td>
                              <div data-toggle="tooltip" title=""></div>
                              <font style='font-weight: bold;color: purple;'>UNKNOWN</font>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </body>
      </html>
    `;
    
    parseAttendanceHtml(testHtml, 2025, 11);
    
    // Check that console.debug was called with unrecognized pattern message
    const unrecognizedCall = debugCalls.find((call) => {
      const args = call as unknown[];
      return args[0] === "[API] Unrecognized attendance pattern:";
    });
    assert.ok(unrecognizedCall, "Should log unrecognized pattern");
    const args = unrecognizedCall as unknown[];
    const patternData = args[1] as { status: string[] };
    assert.ok(patternData.status.includes("UNKNOWN"), "Should include unknown status");
  } finally {
    console.debug = originalDebug;
  }
});
