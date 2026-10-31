import { describe, expect, it } from "vitest";
import {
  clock,
  compatible,
  defaultRate,
  parseRate,
  percentChange,
  rateInput,
  repeatBilling,
  suggestTasks,
  timeframeRange,
  duration,
  elapsed,
  formatUserCode,
  reportDate,
  selectedWorkspace,
  serverOrigin,
  timerSelection,
  verificationUrl,
} from "../src/lib/domain";
import type { Entry, Resources, Workspace } from "../src/lib/types";
const personal: Workspace = {
  id: "personal",
  kind: "personal",
  name: "Personal",
  writable: true,
};
const team: Workspace = {
  id: "team",
  kind: "team",
  name: "Team",
  writable: true,
};
const resources: Resources = {
  projects: [
    { id: "p1", name: "Website", clientId: "c1" },
    { id: "p2", name: "App", clientId: "c2" },
  ],
  tags: [
    { id: "t1", name: "Design", projectId: "p1", clientId: null },
    { id: "t2", name: "Client tag", projectId: null, clientId: "c2" },
  ],
};
describe("workspace and resource selection", () => {
  it("remembers available workspaces and falls back when access is removed", () => {
    expect(selectedWorkspace([personal, team], "team")).toBe("team");
    expect(selectedWorkspace([personal], "team")).toBe("personal");
  });
  it("infers a tag's project for team timers", () => {
    expect(timerSelection(team, resources, "", ["t1"])).toEqual({
      workspaceId: "team",
      projectId: "p1",
      tagIds: ["t1"],
    });
    expect(() => timerSelection(team, resources, "", [])).toThrow(
      "require a project",
    );
  });
  it("permits unassigned personal timers but blocks removed and read-only scopes", () => {
    expect(timerSelection(personal, resources, "", []).projectId).toBeNull();
    expect(() =>
      timerSelection({ ...team, writable: false }, resources, "p1", []),
    ).toThrow("read-only");
    expect(() => timerSelection(personal, resources, "missing", [])).toThrow(
      "available project",
    );
    expect(() => timerSelection(personal, resources, "", ["missing"])).toThrow(
      "available tags",
    );
  });
  it("rejects both project and client incompatibilities", () => {
    expect(compatible(resources.projects[1], resources.tags[0])).toBe(false);
    expect(compatible(resources.projects[0], resources.tags[1])).toBe(false);
    expect(() => timerSelection(team, resources, "p2", ["t1"])).toThrow(
      "different project or client",
    );
  });
  it("keeps several tags in order and rejects tags that disagree", () => {
    const more = {
      ...resources,
      tags: [
        ...resources.tags,
        { id: "t3", name: "Copy", projectId: null, clientId: null },
        { id: "t4", name: "Other client", projectId: null, clientId: "c1" },
      ],
    };
    expect(timerSelection(personal, more, "", ["t3", "t1"])).toEqual({
      workspaceId: "personal",
      projectId: "p1",
      tagIds: ["t3", "t1"],
    });
    // t2 is tied to client c2; t4 to c1.
    expect(compatible(undefined, more.tags[3], [more.tags[1]])).toBe(false);
    expect(() => timerSelection(personal, more, "", ["t2", "t4"])).toThrow(
      "“Other client” belongs to a different project or client.",
    );
  });
});
describe("billing", () => {
  it("defaults to the first tag with a rate, then the project", () => {
    const project = { billingRateMinor: 5000, billingCurrency: "EUR" };
    const unrated = { billingRateMinor: null, billingCurrency: null };
    const rated = { billingRateMinor: 9000, billingCurrency: "USD" };
    expect(defaultRate(project, [unrated, rated])).toEqual(rated);
    expect(defaultRate(project, [unrated])).toEqual(project);
    expect(defaultRate(undefined, [])).toBeUndefined();
  });
  it("repeats an entry's rate choice from the entry alone", () => {
    const base = { id: "e", taskName: "Task", startTime: 0, durationMs: 0 };
    expect(
      repeatBilling({
        ...base,
        isBillable: true,
        billingSource: "custom",
        billingRateMinor: 9000,
        billingCurrency: "USD",
      } as Entry),
    ).toEqual({
      mode: "custom",
      billingRateMinor: 9000,
      billingCurrency: "USD",
    });
    expect(
      repeatBilling({
        ...base,
        isBillable: false,
        billingSource: "none",
      } as Entry),
    ).toEqual({ mode: "none" });
    expect(
      repeatBilling({
        ...base,
        isBillable: true,
        billingSource: "project",
      } as Entry),
    ).toEqual({ mode: "default" });
  });
  it("parses hourly amounts in the currency's minor units", () => {
    expect(parseRate("85", "EUR")).toBe(8500);
    expect(parseRate("1,234.5", "USD")).toBe(123450);
    expect(parseRate("1500", "JPY")).toBe(1500);
    expect(parseRate("12.345", "EUR")).toBeUndefined();
    expect(parseRate("-5", "EUR")).toBeUndefined();
    expect(parseRate("abc", "EUR")).toBeUndefined();
    expect(rateInput(8550, "EUR")).toBe("85.50");
    expect(parseRate(rateInput(8550, "EUR"), "EUR")).toBe(8550);
  });
});
describe("task autocomplete", () => {
  const make = (id: string, taskName: string, extra: Partial<Entry> = {}) =>
    ({
      id,
      taskName,
      projectName: null,
      tagName: null,
      startTime: 0,
      endTime: 1,
      durationMs: 1,
      isRunning: false,
      ...extra,
    }) as Entry;
  // Newest first, as the API returns them.
  const history = [
    make("1", "Review copy"),
    make("2", "Design review", { tagNames: ["Client"] }),
    make("3", "review copy"),
    make("4", "Invoices", { projectName: "Review board" }),
    make("5", "Running now", { isRunning: true }),
  ];
  it("ranks prefix, then contains, then project/tag matches, deduplicated", () => {
    expect(suggestTasks(history, "rev", 10).map((e) => e.id)).toEqual([
      "1",
      "2",
      "4",
    ]);
    expect(suggestTasks(history, "client", 10).map((e) => e.id)).toEqual(["2"]);
  });
  it("lists distinct recent tasks when empty, never the running entry", () => {
    expect(suggestTasks(history, "", 2).map((e) => e.id)).toEqual(["1", "2"]);
    expect(suggestTasks(history, "running", 5)).toEqual([]);
  });
});
describe("report timeframes", () => {
  // Wednesday, 15 October 2026 (UTC).
  const now = new Date("2026-10-15T12:00:00Z");
  it("uses UTC dates and compares with the preceding equal period", () => {
    expect(timeframeRange("this-week", now)).toEqual({
      from: "2026-10-12",
      to: "2026-10-15",
      previousFrom: "2026-10-08",
      previousTo: "2026-10-11",
      days: 4,
    });
    expect(timeframeRange("last-month", now)).toMatchObject({
      from: "2026-09-01",
      to: "2026-09-30",
      previousFrom: "2026-08-02",
      previousTo: "2026-08-31",
      days: 30,
    });
    expect(timeframeRange("last-30-days", now)).toMatchObject({
      from: "2026-09-16",
      days: 30,
    });
    expect(timeframeRange("this-year", now).from).toBe("2026-01-01");
  });
  it("reports change only when there is a previous total", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(50, 0)).toBeUndefined();
  });
});
describe("format and server boundaries", () => {
  it("matches API UTC dates and never formats negative duration", () => {
    expect(reportDate(new Date("2026-10-07T00:30:00+02:00"))).toBe(
      "2026-10-06",
    );
    expect(duration(-100)).toBe("0m");
    expect(duration(45 * 60000)).toBe("45m");
    expect(duration(3660000)).toBe("1h 1m");
    expect(clock(3723000)).toBe("1:02:03");
    expect(clock(-5)).toBe("0:00:00");
  });
  it("advances a running snapshot locally and formats device codes", () => {
    const snapshot = {
      running: true,
      elapsedMs: 60000,
      asOf: "2026-10-07T00:00:00Z",
    };
    expect(elapsed(snapshot, Date.parse("2026-10-07T00:01:00Z"))).toBe(120000);
    expect(elapsed({ ...snapshot, running: false })).toBe(0);
    expect(formatUserCode("abcd efgh")).toBe("ABCD-EFGH");
  });
  it("allows HTTPS and loopback development only", () => {
    expect(serverOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(serverOrigin("")).toBe("https://app.ttrackii.com");
    for (const value of [
      "http://example.com",
      "https://user:password@example.com",
      "https://example.com/api",
      "https://example.com/?token=x",
    ])
      expect(() => serverOrigin(value)).toThrow();
  });
  it("never opens an approval URL from an unrelated origin or path", () => {
    expect(
      verificationUrl(
        { verification_uri: "/device" },
        "https://app.ttrackii.com",
      ),
    ).toBe("https://app.ttrackii.com/device");
    expect(() =>
      verificationUrl(
        { verification_uri: "https://attacker.invalid/device" },
        "https://app.ttrackii.com",
      ),
    ).toThrow();
    expect(() =>
      verificationUrl(
        { verification_uri: "/other" },
        "https://app.ttrackii.com",
      ),
    ).toThrow();
  });
});
