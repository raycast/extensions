import { describe, expect, it } from "vitest";
import {
  deploymentHistoryDays,
  getApiToken,
  parseConfiguredJobs,
  requireApiToken,
  retentionPreferences,
} from "../preferences";
import { GearsetPreferences } from "../types";

const preferences: GearsetPreferences = {
  apiToken: " automation ",
  reportingApiToken: " reporting ",
  auditApiToken: " audit ",
  historyDays: "30",
  historyLimit: "100",
  deploymentHistoryDays: "45",
};

describe("configured CI jobs", () => {
  it("parses job names, UUIDs, and environments", () => {
    expect(
      parseConfiguredJobs(
        "Example Sandbox|11111111-1111-4111-8111-111111111111|sandbox\nExample Production|22222222-2222-4222-8222-222222222222|production",
      ),
    ).toEqual([
      { name: "Example Sandbox", id: "11111111-1111-4111-8111-111111111111", environment: "sandbox" },
      { name: "Example Production", id: "22222222-2222-4222-8222-222222222222", environment: "production" },
    ]);
  });

  it("rejects invalid UUIDs and environments", () => {
    expect(() => parseConfiguredJobs("Broken|123|sandbox")).toThrow("Invalid CI job");
    expect(() => parseConfiguredJobs("Unclassified|11111111-1111-4111-8111-111111111111")).toThrow("Invalid CI job");
    expect(() => parseConfiguredJobs("Extra|11111111-1111-4111-8111-111111111111|sandbox|ignored")).toThrow(
      "Invalid CI job",
    );
    expect(() => parseConfiguredJobs("Broken|11111111-1111-4111-8111-111111111111|prod")).toThrow(
      "Invalid environment",
    );
  });
});

describe("retention preferences", () => {
  it("falls back for invalid values", () => {
    expect(retentionPreferences({ ...preferences, historyDays: "0", historyLimit: "nope" })).toEqual({
      days: 30,
      limit: 100,
    });
  });

  it("caps team deployment history at the Audit API limit", () => {
    expect(deploymentHistoryDays({ ...preferences, deploymentHistoryDays: "120" })).toBe(90);
    expect(deploymentHistoryDays({ ...preferences, deploymentHistoryDays: "invalid" })).toBe(30);
  });
});

describe("API-specific tokens", () => {
  it("selects and trims the token for each Gearset API", () => {
    expect(getApiToken("automation", preferences)).toBe("automation");
    expect(getApiToken("reporting", preferences)).toBe("reporting");
    expect(getApiToken("audit", preferences)).toBe("audit");
  });

  it("reports which token is missing", () => {
    expect(() => requireApiToken("audit", { ...preferences, auditApiToken: "" })).toThrow("Audit API token");
  });
});
