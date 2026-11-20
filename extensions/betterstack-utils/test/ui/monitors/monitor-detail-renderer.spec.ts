import { vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({
    apiToken: "test-token",
  })),
  environment: { supportPath: "/tmp", raycastVersion: "2.0.0", appearance: "dark" },
}));

vi.mock("@/common/utils/svg-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/common/utils/svg-utils")>()),
  toImageDataUri: vi.fn(async (svg: string) => `data:${svg}`),
}));

vi.mock("@/ui/monitors/components/monitor-status-header", () => ({
  buildMonitorStatusHeaderSvg: vi.fn(async () => "header"),
}));

vi.mock("@/ui/monitors/components/monitor-availability-table", () => ({
  buildMonitorAvailabilityTableSvg: vi.fn(async () => "table"),
  buildMonitorAvailabilitySkeletonSvg: vi.fn(async () => "skeleton"),
}));

vi.mock("@/ui/monitors/components/monitor-details-table", () => ({
  buildMonitorDetailsTableSvg: vi.fn(async () => "details"),
}));

import { describe, expect, it } from "vitest";
import {
  buildMonitorDetailMarkdown,
  prerenderMonitorDetailImages,
  renderMonitorAvailability,
} from "@/ui/monitors/monitor-detail-renderer";
import { buildMonitorStatusHeaderSvg } from "@/ui/monitors/components/monitor-status-header";
import {
  buildMonitorAvailabilitySkeletonSvg,
  buildMonitorAvailabilityTableSvg,
} from "@/ui/monitors/components/monitor-availability-table";
import { buildMonitorDetailsTableSvg } from "@/ui/monitors/components/monitor-details-table";
import { Monitor, MonitorStatus } from "@/domain/monitor";
import { MonitorAvailabilityPeriod } from "@/domain/monitor-sla";

const monitor: Monitor = {
  id: "1",
  name: "Homepage",
  url: "https://example.com",
  monitorType: "http",
  status: MonitorStatus.UP,
  checkFrequency: 180,
  lastCheckedAt: undefined,
  createdAt: undefined,
  httpMethod: "get",
  requestTimeout: 30,
  recoveryPeriod: 0,
  regions: ["us", "eu"],
  sslExpiration: 30,
  domainExpiration: 365,
};

const periods: MonitorAvailabilityPeriod[] = [
  {
    label: "Today",
    sla: { availability: 100, totalDowntime: 0, numberOfIncidents: 0, longestIncident: 0, averageIncident: 0 },
  },
  {
    label: "Last 7 days",
    sla: { availability: 99.98, totalDowntime: 600, numberOfIncidents: 3, longestIncident: 300, averageIncident: 200 },
  },
];

const bareMonitor: Monitor = {
  ...monitor,
  monitorType: undefined,
  httpMethod: undefined,
  checkFrequency: undefined,
  requestTimeout: undefined,
  recoveryPeriod: undefined,
  regions: [],
  sslExpiration: undefined,
  domainExpiration: undefined,
};

describe("buildMonitorDetailMarkdown", () => {
  it("shows the URL right under the header, before the availability table", () => {
    const markdown = buildMonitorDetailMarkdown(
      monitor,
      { headerMarkdown: "![status](data:header)", detailsMarkdown: undefined },
      "![availability](data:table)",
    );
    expect(markdown).toMatch(/^!\[status\]\(data:header\)\n\nexample\.com\n\n### Availability/);
    expect(markdown).not.toContain("| URL |");
  });

  it("does not repeat the URL when the monitor is named after it", () => {
    const unnamedMonitor: Monitor = { ...monitor, name: "https://example.com" };
    const markdown = buildMonitorDetailMarkdown(
      unnamedMonitor,
      { headerMarkdown: "![status](data:header)", detailsMarkdown: undefined },
      "availability",
    );
    expect(markdown).not.toContain("example.com");
  });

  it("uses the given header markdown", () => {
    const markdown = buildMonitorDetailMarkdown(
      monitor,
      { headerMarkdown: "![status](data:image/png;base64,AAAA)", detailsMarkdown: undefined },
      "availability",
    );
    expect(markdown).toContain("![status](data:image/png;base64,AAAA)");
    expect(markdown).not.toContain("## Homepage");
  });

  it("places the details markdown under its heading, after the availability table", () => {
    const markdown = buildMonitorDetailMarkdown(
      monitor,
      { headerMarkdown: "header", detailsMarkdown: "![details](data:details)" },
      "availability",
    );
    expect(markdown).toMatch(/### Availability\n\navailability\n\n### Details\n\n!\[details\]\(data:details\)$/);
  });

  it("omits the details section when there is no details markdown", () => {
    const markdown = buildMonitorDetailMarkdown(
      monitor,
      { headerMarkdown: "header", detailsMarkdown: undefined },
      "availability",
    );
    expect(markdown).not.toContain("### Details");
  });

  it("places the availability markdown under its heading", () => {
    const markdown = buildMonitorDetailMarkdown(
      monitor,
      { headerMarkdown: "header", detailsMarkdown: undefined },
      "![availability](data:table)",
    );
    expect(markdown).toContain("### Availability\n\n![availability](data:table)");
  });
});

describe("renderMonitorAvailability", () => {
  it("renders the loaded table as an image", async () => {
    const markdown = await renderMonitorAvailability(monitor, { periods, isLoading: false, isError: false });
    expect(buildMonitorAvailabilityTableSvg).toHaveBeenCalledWith(periods);
    expect(markdown).toBe("![availability](data:table)");
  });

  it("renders a skeleton with every period label while loading", async () => {
    const markdown = await renderMonitorAvailability(monitor, { periods: [], isLoading: true, isError: false });
    expect(buildMonitorAvailabilitySkeletonSvg).toHaveBeenCalledWith([
      "Today",
      "Last 7 days",
      "Last 30 days",
      "Last 365 days",
      "All time",
    ]);
    expect(markdown).toBe("![availability](data:skeleton)");
  });

  it("shows a note when there is no availability data", async () => {
    const markdown = await renderMonitorAvailability(monitor, { periods: [], isLoading: false, isError: false });
    expect(markdown).toBe("_No availability data._");
  });

  it("shows an error note when availability failed to load", async () => {
    const markdown = await renderMonitorAvailability(monitor, { periods: [], isLoading: false, isError: true });
    expect(markdown).toBe("_Failed to load availability data._");
  });
});

describe("prerenderMonitorDetailImages", () => {
  it("renders the status header, the availability skeleton and the details table", async () => {
    const images = await prerenderMonitorDetailImages(monitor);
    expect(images).toEqual({
      headerMarkdown: "![status](data:header)",
      availabilitySkeletonMarkdown: "![availability](data:skeleton)",
      detailsMarkdown: "![details](data:details)",
    });
  });

  it("renders the details table with formatted values", async () => {
    await prerenderMonitorDetailImages({ ...monitor, domainExpiration: 1 });
    expect(buildMonitorDetailsTableSvg).toHaveBeenLastCalledWith([
      ["Type", "Http"],
      ["Method", "GET"],
      ["Check frequency", "3m"],
      ["Request timeout", "30s"],
      ["Regions", "US, EU"],
      ["SSL expiration", "30 days"],
      ["Domain expiration", "1 day"],
    ]);
  });

  it("skips the details table when no details are known", async () => {
    const images = await prerenderMonitorDetailImages(bareMonitor);
    expect(images.detailsMarkdown).toBeUndefined();
  });

  it("falls back to a markdown details table when the image fails to render", async () => {
    vi.mocked(buildMonitorDetailsTableSvg).mockRejectedValueOnce(new Error("satori failed"));
    const images = await prerenderMonitorDetailImages({ ...monitor, checkFrequency: 60 });
    expect(images.detailsMarkdown).toContain("| Field | Value |");
    expect(images.detailsMarkdown).toContain("| Check frequency | 1m |");
  });

  it("reuses the images rendered for the same monitor", async () => {
    const cachedMonitor: Monitor = { ...monitor, name: "Cached" };
    const callCountBefore = vi.mocked(buildMonitorStatusHeaderSvg).mock.calls.length;
    await prerenderMonitorDetailImages(cachedMonitor);
    await prerenderMonitorDetailImages(cachedMonitor);
    expect(vi.mocked(buildMonitorStatusHeaderSvg).mock.calls.length - callCountBefore).toBe(1);
  });

  it("falls back to a text header when the header fails to render", async () => {
    vi.mocked(buildMonitorStatusHeaderSvg).mockRejectedValueOnce(new Error("satori failed"));
    const images = await prerenderMonitorDetailImages({ ...monitor, name: "Broken" });
    expect(images.headerMarkdown).toBe("## Broken");
  });
});
