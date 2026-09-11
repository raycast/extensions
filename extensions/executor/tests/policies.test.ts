import { describe, expect, test } from "bun:test";
import {
  createPolicyPayload,
  exactPolicyPattern,
  integrationPolicyPattern,
  patternDescription,
  policyMatchesFilter,
  policyConnectionTarget,
  policyPresentation,
  policySummary,
  updatePolicyPayload,
  validatePolicyPattern,
  type Policy,
} from "../src/lib/policies";

const policy: Policy = {
  id: "policy-1",
  owner: "org",
  pattern: "github.*.*.issues.create",
  action: "require_approval",
  position: "a0",
  createdAt: 1,
  updatedAt: 1,
};

describe("policy management boundaries", () => {
  test("guided targets preserve the exact tool connection and operation", () => {
    expect(exactPolicyPattern("tools.github.user.personal.issues.create")).toBe("github.user.personal.issues.create");
    expect(exactPolicyPattern("github.org.engineering.issues.create")).toBe("github.org.engineering.issues.create");
    expect(exactPolicyPattern("google_sheets.user.personal.sheets.values.batchGet")).toBe(
      "google_sheets.user.personal.sheets.values.batchGet",
    );
    expect(() => exactPolicyPattern("github.*.personal.issues.create")).toThrow("exact tool");
    expect(() => exactPolicyPattern("github..issues.create")).toThrow("exact tool");
  });

  test("only integration choices introduce the integration subtree wildcard", () => {
    expect(integrationPolicyPattern("github")).toBe("github.*");
    expect(integrationPolicyPattern("google_sheets")).toBe("google_sheets.*");
    for (const slug of ["", "*", "github.*", "github..admin", "github/user"]) {
      expect(() => integrationPolicyPattern(slug)).toThrow("Choose an integration");
    }
  });
  test("accepts Executor pattern grammar and rejects partial or leading wildcards", () => {
    expect(validatePolicyPattern("*")).toBeUndefined();
    expect(validatePolicyPattern("github.*.*.issues.create")).toBeUndefined();
    expect(validatePolicyPattern("github.issues.*")).toBeUndefined();
    expect(validatePolicyPattern("*.issues.create")).toContain("may start");
    expect(validatePolicyPattern("github.issue*")).toContain("complete");
    expect(validatePolicyPattern("github..create")).toContain("empty");
  });

  test("describes broad wildcard impact before saving", () => {
    expect(patternDescription("*")).toContain("every tool");
    expect(patternDescription("github.*")).toContain("every tool below");
    expect(policySummary(policy)).toContain("Workspace (everyone in this workspace)");
    expect(policySummary({ ...policy, owner: "user" })).toContain("Personal (only you in this workspace)");
    expect(policySummary(policy)).toContain(policy.pattern);
  });

  test("presents universal and provider-wide patterns without raw addresses", () => {
    expect(policyPresentation("*")).toEqual({
      title: "All Tools",
      target: "Every tool from every integration",
      wildcard: "universal",
    });
    expect(policyPresentation("google_drive.*")).toMatchObject({
      title: "Google Drive Tools",
      providerSlug: "google_drive",
      wildcard: "subtree",
    });
  });

  test("uses resources for subtree and generic segment-wildcard operations", () => {
    expect(policyPresentation("github.*.*.issues.*")).toMatchObject({
      title: "Issues Tools",
      resource: "Issues",
      wildcard: "subtree",
    });
    expect(policyPresentation("github.*.*.drafts.list")).toMatchObject({
      title: "List Drafts",
      target: "Drafts",
      wildcard: "segment",
    });
  });

  test("labels exact tools from the operation tail with useful resource context", () => {
    expect(policyPresentation("github.user.personal.pull_requests.get")).toMatchObject({
      title: "Get Pull Requests",
      target: "Pull Requests",
      wildcard: "exact",
    });
    expect(policyPresentation("sheets.user.main.values.batchGetByDataFilter")).toMatchObject({
      title: "Batch Get By Data Filter",
      resource: "Values",
    });
  });

  test("extracts only exact workspace-scoped connection identities", () => {
    expect(policyConnectionTarget("safetyculture.user.personal.users.list")).toEqual({
      integration: "safetyculture",
      owner: "user",
      name: "personal",
    });
    expect(policyConnectionTarget("safetyculture.org.mta.users.list")).toEqual({
      integration: "safetyculture",
      owner: "org",
      name: "mta",
    });
    expect(policyConnectionTarget("safetyculture.*.personal.users.list")).toBeUndefined();
    expect(policyConnectionTarget("safetyculture.user.*.users.list")).toBeUndefined();
  });

  test("maps owner and action filters without computing an effective policy", () => {
    expect(policyMatchesFilter(policy, "owner:org")).toBe(true);
    expect(policyMatchesFilter(policy, "action:require_approval")).toBe(true);
    expect(policyMatchesFilter(policy, "owner-action:user:require_approval")).toBe(false);
  });

  test("create omits position so Executor owns ordering", () => {
    expect(createPolicyPayload(policy)).toEqual({
      owner: "org",
      pattern: "github.*.*.issues.create",
      action: "require_approval",
    });
  });

  test("updates preserve the row owner and omit its server-owned position and id", () => {
    expect(updatePolicyPayload(policy, { pattern: " github.* ", action: "block" })).toEqual({
      owner: "org",
      pattern: "github.*",
      action: "block",
    });
  });
});
