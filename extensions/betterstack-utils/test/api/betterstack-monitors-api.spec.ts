import { vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({
    apiToken: "test-token",
  })),
}));

import { describe, expect, it } from "vitest";
import { buildMonitorWebUrl, toMonitor } from "@/api/betterstack-monitors-api";
import { MonitorStatus } from "@/domain/monitor";

describe("buildMonitorWebUrl", () => {
  it("includes the team segment when a teamId is set", () => {
    expect(buildMonitorWebUrl("123", "456")).toBe("https://uptime.betterstack.com/team/t456/monitors/123");
  });

  it("omits the team segment when no teamId is set", () => {
    expect(buildMonitorWebUrl("123", undefined)).toBe("https://uptime.betterstack.com/monitors/123");
  });

  it("trims a whitespace-only teamId and omits the team segment", () => {
    expect(buildMonitorWebUrl("123", "  ")).toBe("https://uptime.betterstack.com/monitors/123");
  });
});

describe("toMonitor", () => {
  it("maps known attributes", () => {
    const monitor = toMonitor({
      id: "2",
      type: "monitor",
      attributes: {
        url: "https://google.com",
        pronounceable_name: "Google homepage",
        monitor_type: "http",
        status: "up",
        check_frequency: 60,
        last_checked_at: "2020-09-01T14:17:46.000Z",
        created_at: "2020-02-18T13:38:16.586Z",
        http_method: "get",
        request_timeout: 10,
        recovery_period: 0,
        regions: ["us", "eu"],
        ssl_expiration: 30,
        domain_expiration: 365,
      },
    });

    expect(monitor).toEqual({
      id: "2",
      name: "Google homepage",
      url: "https://google.com",
      monitorType: "http",
      status: MonitorStatus.UP,
      checkFrequency: 60,
      lastCheckedAt: "2020-09-01T14:17:46.000Z",
      createdAt: "2020-02-18T13:38:16.586Z",
      httpMethod: "get",
      requestTimeout: 10,
      recoveryPeriod: 0,
      regions: ["us", "eu"],
      sslExpiration: 30,
      domainExpiration: 365,
    });
  });

  it("falls back to the url as the name when pronounceable_name is missing", () => {
    const monitor = toMonitor({
      id: "2",
      type: "monitor",
      attributes: { url: "https://google.com", status: "up" },
    });

    expect(monitor.name).toBe("https://google.com");
  });

  it("defaults regions to an empty array when missing", () => {
    const monitor = toMonitor({
      id: "2",
      type: "monitor",
      attributes: { url: "https://google.com", status: "up" },
    });

    expect(monitor.regions).toEqual([]);
  });

  it("falls back to Pending for an unrecognized status", () => {
    const monitor = toMonitor({
      id: "2",
      type: "monitor",
      attributes: { url: "https://google.com", status: "something-new" },
    });

    expect(monitor.status).toBe(MonitorStatus.PENDING);
  });
});
