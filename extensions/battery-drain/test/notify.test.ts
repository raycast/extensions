import { describe, expect, it } from "vitest";
import { appleScriptString, newRunaways, NOTIFY_TTL_MS, processStart, recordNotified } from "../src/analysis/notify";
import { Runaway } from "../src/analysis/runaway";

const zsh: Runaway = { pid: 10449, command: "zsh", cpu: 99, sinceSec: 79942 };
const yes: Runaway = { pid: 42, command: "yes", cpu: 99, sinceSec: 900 };
const HOUR = 3_600_000;

describe("runaway notifications", () => {
  const startOf = (pid: number) => (pid === 10449 ? 1000 : 2000);

  it("returns only runaways not notified yet", () => {
    const entries = recordNotified([], [zsh], startOf, 0);
    expect(newRunaways([zsh, yes], entries, startOf)).toEqual([yes]);
  });

  it("does not notify again after the runaway drops out of detection for a run", () => {
    // run 1: detected and notified; run 2: top timed out, nothing detected; run 3: detected again
    let entries = recordNotified([], newRunaways([zsh], [], startOf), startOf, 0);
    entries = recordNotified(entries, newRunaways([], entries, startOf), startOf, 60_000);
    expect(newRunaways([zsh], entries, startOf)).toEqual([]);
  });

  it("does not notify again when only the name changes, e.g. ps failed and top's short name came back", () => {
    const entries = recordNotified([], [{ ...zsh, command: "Example Sync Service" }], startOf, 0);
    expect(newRunaways([{ ...zsh, command: "Example Sync Ser" }], entries, startOf)).toEqual([]);
  });

  it("notifies for a new process that reuses an old pid", () => {
    const entries = recordNotified([], [zsh], () => 1000, 0);
    expect(newRunaways([zsh], entries, () => 5 * HOUR)).toEqual([zsh]);
  });

  it("forgets entries after a day", () => {
    const entries = recordNotified([], [zsh], startOf, 0);
    expect(recordNotified(entries, [], startOf, NOTIFY_TTL_MS + 1)).toEqual([]);
  });

  it("derives a stable start time from uptime", () => {
    const info = { etimeSec: 100, cpuTimeSec: 0, user: "me", ppid: 1, command: "x", path: "x" };
    expect(processStart(200_000, info)).toBe(processStart(230_000, { ...info, etimeSec: 130 }));
    expect(processStart(0, undefined)).toBeUndefined();
  });
});

describe("appleScriptString", () => {
  it("quotes and escapes backslashes and double quotes", () => {
    expect(appleScriptString('say "hi" \\ bye')).toBe('"say \\"hi\\" \\\\ bye"');
  });
});
