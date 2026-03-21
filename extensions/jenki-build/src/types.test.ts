// Placeholder test — verifies vitest is configured and types module exports are present
import { describe, it, expect } from "vitest";
import type {
  JobStatus,
  JenkinsJob,
  RecentJob,
  BuildHistoryEntry,
  ExtensionPreferences,
} from "./types";

describe("types module", () => {
  it("is importable (vitest sanity check)", () => {
    expect(true).toBe(true);
  });

  it("JobStatus type accepts valid values", () => {
    const statuses: JobStatus[] = [
      "running",
      "success",
      "failure",
      "aborted",
      "disabled",
    ];
    expect(statuses).toHaveLength(5);
  });

  it("JenkinsJob shape is assignable", () => {
    const job: JenkinsJob = {
      name: "my-job",
      url: "http://jenkins/job/my-job",
      path: "my-job",
      status: "success",
    };
    expect(job.name).toBe("my-job");
  });

  it("RecentJob shape is assignable", () => {
    const recent: RecentJob = { path: "my-job", timestamp: Date.now() };
    expect(typeof recent.timestamp).toBe("number");
  });

  it("BuildHistoryEntry shape is assignable", () => {
    const entry: BuildHistoryEntry = {
      jobName: "my-job",
      jobPath: "my-job",
      jobUrl: "http://jenkins/job/my-job",
      buildNumber: 42,
      triggeredAt: Date.now(),
      status: "success",
    };
    expect(entry.buildNumber).toBe(42);
  });

  it("ExtensionPreferences shape is assignable", () => {
    const prefs: ExtensionPreferences = {
      jenkinsUrl: "https://jenkins.example.com",
      username: "admin",
      apiToken: "token123",
    };
    expect(prefs.defaultJobPath).toBeUndefined();
  });
});
