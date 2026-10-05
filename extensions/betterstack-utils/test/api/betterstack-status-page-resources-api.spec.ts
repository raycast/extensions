import { vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({ apiToken: "test-token" })),
}));

import { describe, expect, it } from "vitest";
import {
  toAvailabilityPercentage,
  toStatusPageResource,
  toStatusPageSection,
} from "@/api/betterstack-status-page-resources-api";
import { ResourceStatus } from "@/domain/status-page-resource";

describe("toStatusPageSection", () => {
  it("maps attributes", () => {
    const section = toStatusPageSection({
      id: "163",
      type: "status_page_section",
      attributes: { name: "Core Services", position: 1 },
    });

    expect(section).toEqual({ id: "163", name: "Core Services", position: 1 });
  });
});

describe("toStatusPageResource", () => {
  it("maps known attributes, including status history", () => {
    const resource = toStatusPageResource({
      id: "365",
      type: "status_page_resource",
      attributes: {
        status_page_section_id: 163,
        public_name: "API Gateway",
        position: 0,
        availability: 99.95,
        status: "degraded",
        status_history: [
          { day: "2025-02-16", status: "operational" },
          { day: "2025-02-17", status: "downtime" },
        ],
      },
    });

    expect(resource).toEqual({
      id: "365",
      sectionId: "163",
      position: 0,
      name: "API Gateway",
      status: ResourceStatus.DEGRADED,
      availability: 99.95,
      history: [
        { day: "2025-02-16", status: ResourceStatus.OPERATIONAL },
        { day: "2025-02-17", status: ResourceStatus.DOWNTIME },
      ],
    });
  });

  it("falls back to Operational for an unrecognized status", () => {
    const resource = toStatusPageResource({
      id: "365",
      type: "status_page_resource",
      attributes: {
        status_page_section_id: 163,
        public_name: "API Gateway",
        position: 0,
        status: "something-new",
        status_history: [],
      },
    });

    expect(resource.status).toBe(ResourceStatus.OPERATIONAL);
  });

  it("defaults availability to 0 and history to an empty array when missing", () => {
    const resource = toStatusPageResource({
      id: "365",
      type: "status_page_resource",
      attributes: { status_page_section_id: 163, public_name: "API Gateway", position: 0 },
    });

    expect(resource.availability).toBe(0);
    expect(resource.history).toEqual([]);
  });
});

describe("toAvailabilityPercentage", () => {
  it("treats a value of 1 or less as a fraction and converts it to a percentage", () => {
    expect(toAvailabilityPercentage(0.99963)).toBeCloseTo(99.963);
  });

  it("uses a value greater than 1 as-is, since it's already a percentage", () => {
    expect(toAvailabilityPercentage(99.95)).toBe(99.95);
  });
});
