import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HarvestApplication, HarvestJobStage } from "./types";
import {
  buildCandidateApplicationUrl,
  buildPipelineSections,
  getDaysSince,
  getStageTintName,
} from "./pipelineUtils";

describe("getDaysSince", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 10, 0, 0, 0)));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns full days since the provided date", () => {
    expect(getDaysSince("2024-01-09T00:00:00Z")).toBe(1);
  });

  it("clamps future dates to zero", () => {
    expect(getDaysSince("2024-01-11T00:00:00Z")).toBe(0);
  });

  it("returns null for invalid or missing dates", () => {
    expect(getDaysSince("not-a-date")).toBeNull();
    expect(getDaysSince()).toBeNull();
  });
});

describe("buildPipelineSections", () => {
  it("groups applications by stage and appends no-stage entries", () => {
    const stages: HarvestJobStage[] = [
      {
        id: 1,
        name: "Applied",
        job_id: 10,
        priority: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
      {
        id: 2,
        name: "Phone",
        job_id: 10,
        priority: 2,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
    ];

    const applications: HarvestApplication[] = [
      {
        id: 101,
        candidate_id: 11,
        applied_at: "2024-01-03T00:00:00Z",
        last_activity_at: null,
        current_stage: { id: 1, name: "Applied" },
        status: "active",
        jobs: [{ id: 10, name: "Engineer" }],
      },
      {
        id: 102,
        candidate_id: 12,
        applied_at: "2024-01-03T00:00:00Z",
        last_activity_at: null,
        current_stage: { id: 2, name: "Phone" },
        status: "active",
        jobs: [{ id: 10, name: "Engineer" }],
      },
      {
        id: 103,
        candidate_id: 13,
        applied_at: "2024-01-03T00:00:00Z",
        last_activity_at: null,
        current_stage: { id: 9, name: "Offer" },
        status: "active",
        jobs: [{ id: 10, name: "Engineer" }],
      },
      {
        id: 104,
        candidate_id: 14,
        applied_at: "2024-01-03T00:00:00Z",
        last_activity_at: null,
        current_stage: null,
        status: "active",
        jobs: [{ id: 10, name: "Engineer" }],
      },
    ];

    const sections = buildPipelineSections(applications, stages);

    expect(sections.map((section) => section.title)).toEqual([
      "Applied",
      "Phone",
      "Offer",
      "No Stage",
    ]);
    expect(sections[0]?.applications).toHaveLength(1);
    expect(sections[1]?.applications).toHaveLength(1);
    expect(sections[2]?.applications).toHaveLength(1);
    expect(sections[3]?.applications).toHaveLength(1);
  });
});

describe("buildCandidateApplicationUrl", () => {
  it("builds a candidate application URL with the default base", () => {
    expect(buildCandidateApplicationUrl(undefined, 123, 456)).toBe(
      "https://s101.recruiting.eu.greenhouse.io/people/123/applications/456/redesign",
    );
  });

  it("trims whitespace and trailing slashes from the base URL", () => {
    expect(
      buildCandidateApplicationUrl(
        " https://s101.recruiting.eu.greenhouse.io/ ",
        123,
        456,
      ),
    ).toBe(
      "https://s101.recruiting.eu.greenhouse.io/people/123/applications/456/redesign",
    );
  });
});

describe("getStageTintName", () => {
  it("maps known stage keywords to colors", () => {
    expect(getStageTintName("Application Review")).toBe("blue");
    expect(getStageTintName("Phone Screen")).toBe("orange");
    expect(getStageTintName("Onsite Interview")).toBe("purple");
    expect(getStageTintName("Offer")).toBe("green");
    expect(getStageTintName("Rejected")).toBe("red");
  });

  it("falls back to secondary text for unknown stages", () => {
    expect(getStageTintName("Custom Stage")).toBe("secondary");
    expect(getStageTintName(undefined)).toBe("secondary");
  });
});
