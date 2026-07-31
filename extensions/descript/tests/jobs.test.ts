import { describe, expect, it } from "vitest";

import { humanizeJobType, isTerminalState, jobTimingDescription } from "../src/lib/jobs";
import type { DescriptJob } from "../src/lib/types";

describe("isTerminalState", () => {
  it("marks stopped, failed, and cancelled as terminal", () => {
    expect(isTerminalState("stopped")).toBe(true);
    expect(isTerminalState("failed")).toBe(true);
    expect(isTerminalState("cancelled")).toBe(true);
  });

  it("marks queued, running, and unknown states as non-terminal", () => {
    expect(isTerminalState("queued")).toBe(false);
    expect(isTerminalState("running")).toBe(false);
    expect(isTerminalState(undefined)).toBe(false);
    expect(isTerminalState("some_future_state")).toBe(false);
  });
});

describe("humanizeJobType", () => {
  it("maps known job types", () => {
    expect(humanizeJobType("import/project_media")).toBe("Import");
    expect(humanizeJobType("import")).toBe("Import");
    expect(humanizeJobType("agent")).toBe("Underlord");
    expect(humanizeJobType("publish")).toBe("Publish");
    expect(humanizeJobType(undefined)).toBe("Job");
  });

  it("title-cases unknown types", () => {
    expect(humanizeJobType("batch_render-final")).toBe("Batch Render Final");
  });
});

describe("jobTimingDescription", () => {
  const base: DescriptJob = { job_id: "j1", job_type: "agent", job_state: "running" };

  it("returns null without usable timestamps", () => {
    expect(jobTimingDescription(base)).toBeNull();
    expect(jobTimingDescription({ ...base, job_state: "stopped" })).toBeNull();
  });

  it("describes a running job from created_at", () => {
    const createdAt = new Date(Date.now() - 5 * 60_000).toISOString();
    const timing = jobTimingDescription({ ...base, created_at: createdAt });
    expect(timing).not.toBeNull();
    expect(timing!.text).toMatch(/minute/);
    expect(timing!.tooltip).toMatch(/^Started /);
  });

  it("describes a finished job with duration in the tooltip", () => {
    const createdAt = new Date(Date.now() - 10 * 60_000).toISOString();
    const stoppedAt = new Date(Date.now() - 2 * 60_000).toISOString();
    const timing = jobTimingDescription({
      ...base,
      job_state: "stopped",
      created_at: createdAt,
      stopped_at: stoppedAt,
    });
    expect(timing).not.toBeNull();
    expect(timing!.tooltip).toContain("Finished");
    expect(timing!.tooltip).toContain("Ran for 8m 00s");
  });

  it("uses the failure verb for failed jobs", () => {
    const stoppedAt = new Date(Date.now() - 60_000).toISOString();
    const timing = jobTimingDescription({ ...base, job_state: "failed", stopped_at: stoppedAt });
    expect(timing!.tooltip).toContain("Failed");
  });
});
