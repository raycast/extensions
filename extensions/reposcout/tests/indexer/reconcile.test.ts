import { describe, expect, it } from "vitest";
import { planEnrichment } from "../../src/indexer/reconcile";
import type { DiscoveredRepository, RepositoryRecord } from "../../src/types/repository";
import { makeRecord } from "../helpers/fixtures";

function discovered(overrides: Partial<DiscoveredRepository>): DiscoveredRepository {
  return { path: "/r", name: "r", kind: "normal", fingerprint: "fp", ...overrides };
}

function previousMap(records: RepositoryRecord[]): Map<string, RepositoryRecord> {
  return new Map(records.map((r) => [r.path, r]));
}

describe("planEnrichment", () => {
  it("reuses a record when path, kind, and fingerprint match", () => {
    const prev = previousMap([makeRecord({ path: "/r", fingerprint: "fp", branch: "cached" })]);
    const plan = planEnrichment([discovered({ path: "/r", fingerprint: "fp" })], prev);
    expect(plan.reused).toHaveLength(1);
    expect(plan.reused[0]?.branch).toBe("cached");
    expect(plan.toEnrich).toHaveLength(0);
  });

  it("re-enriches when the fingerprint changed", () => {
    const prev = previousMap([makeRecord({ path: "/r", fingerprint: "old" })]);
    const plan = planEnrichment([discovered({ path: "/r", fingerprint: "new" })], prev);
    expect(plan.toEnrich).toHaveLength(1);
    expect(plan.reused).toHaveLength(0);
  });

  it("re-enriches when either fingerprint is null", () => {
    const prev = previousMap([makeRecord({ path: "/r", fingerprint: null })]);
    const plan = planEnrichment([discovered({ path: "/r", fingerprint: null })], prev);
    expect(plan.toEnrich).toHaveLength(1);
  });

  it("re-enriches when the kind changed", () => {
    const prev = previousMap([makeRecord({ path: "/r", kind: "normal", fingerprint: "fp" })]);
    const plan = planEnrichment([discovered({ path: "/r", kind: "bare", fingerprint: "fp" })], prev);
    expect(plan.toEnrich).toHaveLength(1);
  });

  it("enriches brand-new repositories", () => {
    const plan = planEnrichment([discovered({ path: "/new" })], new Map());
    expect(plan.toEnrich).toHaveLength(1);
  });

  it("adopts the latest name when reusing", () => {
    const prev = previousMap([makeRecord({ path: "/r", name: "old", fingerprint: "fp" })]);
    const plan = planEnrichment([discovered({ path: "/r", name: "renamed", fingerprint: "fp" })], prev);
    expect(plan.reused[0]?.name).toBe("renamed");
  });
});
