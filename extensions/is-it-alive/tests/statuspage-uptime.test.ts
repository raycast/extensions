import { describe, expect, it } from "vitest";

import {
  calcStatuspageUptimePercent,
  dayLevelFromUptimeDay,
  parseStatuspageUptimeHtml,
} from "@/lib/statuspage-uptime";

function wrapUptimeScript(payload: string): string {
  return `<!doctype html><html><body><script>window.uptimeData = ${payload};</script></body></html>`;
}

describe("parseStatuspageUptimeHtml", () => {
  it("parses a real-shaped embedded payload", () => {
    const html = wrapUptimeScript(`{
      "comp-1": {
        "component": { "code": "comp-1", "name": "API" },
        "days": [
          { "date": "2026-07-01T00:00:00Z", "outages": { "m": 120 } },
          {
            "date": "2026-07-02T00:00:00Z",
            "outages": {},
            "related_events": [{ "name": "Maint", "code": "evt-1" }]
          },
          { "date": "2026-07-03T00:00:00Z", "outages": { "p": 600 } },
          { "date": "2026-07-04T00:00:00Z", "outages": { "d": 300 } }
        ]
      }
    }`);

    const data = parseStatuspageUptimeHtml(html);
    const days = data["comp-1"]?.days ?? [];

    expect(days).toHaveLength(4);
    expect(dayLevelFromUptimeDay(days[0])).toBe("major");
    expect(dayLevelFromUptimeDay(days[1])).toBe("operational");
    expect(dayLevelFromUptimeDay(days[2])).toBe("partial");
    expect(dayLevelFromUptimeDay(days[3])).toBe("degraded");
  });

  it("handles escaped quotes inside string values", () => {
    const html = wrapUptimeScript(`{
      "comp-1": {
        "component": { "code": "comp-1", "name": "API \\"v2\\"" },
        "days": [{ "date": "2026-07-01T00:00:00Z", "outages": {} }]
      }
    }`);

    const data = parseStatuspageUptimeHtml(html);
    expect(data["comp-1"]?.component.name).toBe('API "v2"');
  });

  it("returns {} when the marker is missing", () => {
    expect(parseStatuspageUptimeHtml("<html></html>")).toEqual({});
  });

  it("returns {} for malformed or unbalanced serialization", () => {
    expect(
      parseStatuspageUptimeHtml(
        wrapUptimeScript(`{ "comp-1": { "days": [ { "date": "2026-07-01"`),
      ),
    ).toEqual({});
    expect(
      parseStatuspageUptimeHtml("window.uptimeData = { not valid json }"),
    ).toEqual({});
  });

  it("returns {} when the marker format changes", () => {
    expect(
      parseStatuspageUptimeHtml(
        `<script>window.__UPTIME__ = ${JSON.stringify({ a: 1 })};</script>`,
      ),
    ).toEqual({});
  });
});

describe("calcStatuspageUptimePercent", () => {
  it("weights major/partial/degraded outage seconds", () => {
    // 1 day: 100s major + 100s partial + 100s degraded
    // downtime = 100*1 + 100*0.3 + 100*0.1 = 140s
    const percent = calcStatuspageUptimePercent([
      {
        date: "2026-07-01T00:00:00Z",
        outages: { m: 100, p: 100, d: 100 },
      },
    ]);

    expect(percent).toBeCloseTo((1 - 140 / 86400) * 100, 9);
  });
});
