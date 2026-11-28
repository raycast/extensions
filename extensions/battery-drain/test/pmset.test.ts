import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseAssertions } from "../src/collectors/assertions";
import { parsePmsetBatt } from "../src/collectors/pmset-batt";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("parsePmsetBatt", () => {
  it("parses discharging with an estimate", () => {
    expect(parsePmsetBatt(fixture("pmset-batt-battery.txt"))).toEqual({
      source: "battery",
      percent: 46,
      state: "discharging",
      minutesRemaining: 436,
    });
  });

  it("parses charging", () => {
    expect(parsePmsetBatt(fixture("pmset-batt-charging.txt"))).toEqual({
      source: "ac",
      percent: 26,
      state: "charging",
      minutesRemaining: 87,
    });
  });

  it("parses AC attached, not charging, with no estimate", () => {
    expect(parsePmsetBatt(fixture("pmset-batt-paused.txt"))).toEqual({
      source: "ac",
      percent: 80,
      state: "AC attached",
      minutesRemaining: undefined,
    });
  });

  it("reads a real Intel (macOS 13) line on a weak charger", () => {
    const text =
      "Now drawing from 'AC Power'\n -InternalBattery-0 (id=6160483)    7%; AC attached; not charging present: true\n";
    expect(parsePmsetBatt(text)).toEqual({
      source: "ac",
      percent: 7,
      state: "AC attached",
      minutesRemaining: undefined,
    });
  });

  it("treats '(no estimate)' as unknown", () => {
    const text =
      "Now drawing from 'Battery Power'\n -InternalBattery-0 (id=1)\t9%; discharging; (no estimate) present: true\n";
    expect(parsePmsetBatt(text)?.minutesRemaining).toBeUndefined();
  });

  it("returns undefined for unrecognised output", () => {
    expect(parsePmsetBatt("")).toBeUndefined();
  });
});

describe("parseAssertions", () => {
  it("lists real sleep blockers and drops powerd and UserIsActive noise", () => {
    expect(parseAssertions(fixture("assertions.txt"))).toEqual([
      {
        id: "0x0001542600018338",
        pid: 73814,
        process: "caffeinate",
        kind: "system",
        assertion: "PreventUserIdleSystemSleep",
        heldSec: 195,
        name: "caffeinate command-line tool",
      },
      {
        id: "0x00015052000182aa",
        pid: 730,
        process: "sharingd",
        kind: "system",
        assertion: "PreventUserIdleSystemSleep",
        heldSec: 117,
        name: "Handoff",
      },
      {
        id: "0x0001505200018300",
        pid: 1204,
        process: "zoom.us",
        kind: "display",
        assertion: "PreventUserIdleDisplaySleep",
        heldSec: 4360,
        name: "Zoom meeting",
      },
    ]);
  });

  it("returns an empty list for empty output", () => {
    expect(parseAssertions("")).toEqual([]);
  });

  it("reads a real Intel (macOS 13) capture: Universal Control blocks display sleep; powerd and kernel lines are not blockers", () => {
    const text = [
      "Listed by owning process:",
      '   pid 500(UniversalControl): [0x0000239200059461] 00:00:19 PreventUserIdleDisplaySleep named: "com.apple.universalcontrol.preventDisplaySleep"  ',
      '   pid 94(powerd): [0x0000232900108536] 00:00:21 InternalPreventDisplaySleep named: "com.apple.powermanagement.delayDisplayOff"  ',
      "    Timeout will fire in 278 secs Action=TimeoutActionTurnOff",
      "Kernel Assertions: 0x100=MAGICWAKE",
      "   id=531  level=255 0x100=MAGICWAKE creat=23.09.2026 14:59 description=llw0 owner=IOSkywalkNetworkBSDClient",
    ].join("\n");
    expect(parseAssertions(text)).toEqual([
      {
        id: "0x0000239200059461",
        pid: 500,
        process: "UniversalControl",
        kind: "display",
        assertion: "PreventUserIdleDisplaySleep",
        heldSec: 19,
        name: "com.apple.universalcontrol.preventDisplaySleep",
      },
    ]);
  });

  it("drops short-lived timed assertions, which are system chatter rather than a culprit", () => {
    // useractivityd's Bluetooth advertising holds for about a minute; seen live on 2026-09-23.
    const text = [
      '   pid 612(useractivityd): [0x0001b5c20001925b] 00:00:04 PreventUserIdleSystemSleep named: "BTLEAdvertisement"  ',
      "\tTimeout will fire in 55 secs Action=TimeoutActionRelease",
      '   pid 70397(caffeinate): [0x0001b5c20001925a] 00:03:37 PreventUserIdleSystemSleep named: "caffeinate command-line tool"  ',
      "\tDetails: caffeinate asserting for 300 secs",
      "\tTimeout will fire in 83 secs Action=TimeoutActionRelease",
    ].join("\n");
    // caffeinate -t 300 has a timeout too, but it holds for five minutes: it stays.
    expect(parseAssertions(text).map((b) => b.process)).toEqual(["caffeinate"]);
  });

  it("identifies each assertion, since one process can hold two identical ones", () => {
    const text = [
      '   pid 900(WebContent): [0x0001000000000001] 00:05:00 PreventUserIdleDisplaySleep named: "Playing video"  ',
      '   pid 900(WebContent): [0x0001000000000002] 00:05:00 PreventUserIdleDisplaySleep named: "Playing video"  ',
    ].join("\n");
    expect(new Set(parseAssertions(text).map((b) => b.id)).size).toBe(2);
  });

  it("keeps process names that contain parentheses", () => {
    const line =
      '   pid 5120(Code Helper (Renderer)): [0x0001505200018301] 00:10:00 PreventUserIdleSystemSleep named: "Electron"  \n';
    expect(parseAssertions(line)).toEqual([
      {
        id: "0x0001505200018301",
        pid: 5120,
        process: "Code Helper (Renderer)",
        kind: "system",
        assertion: "PreventUserIdleSystemSleep",
        heldSec: 600,
        name: "Electron",
      },
    ]);
  });
});

describe("parsePmsetBatt on a desktop Mac with a UPS", () => {
  const ups = (source: string) =>
    `Now drawing from '${source}'\n -CP1500PFCLCD (id=19070976)\t100%; charged; 0:00 remaining present: true\n`;

  it("treats UPS power as external power, not as a MacBook battery", () => {
    expect(parsePmsetBatt(ups("UPS Power"))?.source).toBe("ac");
  });

  it("reads no battery percentage from the UPS line", () => {
    expect(parsePmsetBatt(ups("AC Power"))).toEqual({ source: "ac" });
  });

  it("still reads the internal battery when both are listed", () => {
    const text = `${ups("AC Power")} -InternalBattery-0 (id=1)\t64%; charging; 1:10 remaining present: true\n`;
    expect(parsePmsetBatt(text)?.percent).toBe(64);
  });
});
