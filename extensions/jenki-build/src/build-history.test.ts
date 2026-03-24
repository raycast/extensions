import { describe, it, expect } from "vitest";
import { buildUrl, reconstructJob } from "./build-history";
import { BuildHistoryEntry } from "./types";
import { getStatusIcon } from "./utils/status";

describe("buildUrl", () => {
  it("constructs URL correctly with trailing slash", () => {
    expect(buildUrl("https://jenkins.example.com/job/my-job/", 42)).toBe(
      "https://jenkins.example.com/job/my-job/42/",
    );
  });

  it("strips trailing slash before appending build number", () => {
    expect(buildUrl("https://jenkins.example.com/job/my-job", 42)).toBe(
      "https://jenkins.example.com/job/my-job/42/",
    );
  });

  it("returns null for buildNumber 0 (queued)", () => {
    expect(buildUrl("https://jenkins.example.com/job/my-job/", 0)).toBeNull();
  });
});

describe("reconstructJob", () => {
  it("creates a valid JenkinsJob from a BuildHistoryEntry", () => {
    const entry: BuildHistoryEntry = {
      jobName: "deploy",
      jobUrl: "https://j.com/job/deploy/",
      jobPath: "deploy",
      buildNumber: 5,
      triggeredAt: 1000,
      status: "success",
    };
    const job = reconstructJob(entry);
    expect(job).toEqual({
      name: "deploy",
      url: "https://j.com/job/deploy/",
      path: "deploy",
      status: "success",
    });
  });
});

describe("getStatusIcon", () => {
  it("returns defined source and tintColor for success", () => {
    const icon = getStatusIcon("success");
    expect(icon.source).toBeDefined();
    expect(icon.tintColor).toBeDefined();
  });

  it("returns defined source and tintColor for failure", () => {
    const icon = getStatusIcon("failure");
    expect(icon.source).toBeDefined();
    expect(icon.tintColor).toBeDefined();
  });

  it("returns defined source and tintColor for running", () => {
    const icon = getStatusIcon("running");
    expect(icon.source).toBeDefined();
    expect(icon.tintColor).toBeDefined();
  });

  it("returns defined source and tintColor for aborted", () => {
    const icon = getStatusIcon("aborted");
    expect(icon.source).toBeDefined();
    expect(icon.tintColor).toBeDefined();
  });

  it("returns defined source and tintColor for disabled", () => {
    const icon = getStatusIcon("disabled");
    expect(icon.source).toBeDefined();
    expect(icon.tintColor).toBeDefined();
  });
});
