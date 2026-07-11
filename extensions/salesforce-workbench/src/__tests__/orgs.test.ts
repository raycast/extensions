import { describe, expect, it } from "vitest";
import { isProduction, normalizeOrgs } from "../orgs";

describe("org normalization", () => {
  it("deduplicates by org ID and uses the first configured alias", () => {
    const orgs = normalizeOrgs([
      {
        orgId: "production-org-example",
        alias: "Production,ProductionReadOnly",
        username: "user@example.com",
        instanceUrl: "https://example.my.salesforce.com",
        isSandbox: false,
        connectedStatus: "Connected",
        instanceApiVersion: "67.0",
      },
      {
        orgId: "production-org-example",
        alias: "AnotherAlias",
        username: "user@example.com",
        instanceUrl: "https://example.my.salesforce.com",
        isSandbox: false,
      },
    ]);

    expect(orgs).toHaveLength(1);
    expect(orgs[0].alias).toBe("Production");
    expect(orgs[0].aliases).toEqual(["Production", "ProductionReadOnly", "AnotherAlias"]);
    expect(isProduction(orgs[0])).toBe(true);
  });

  it("detects production from isSandbox rather than alias text", () => {
    const [org] = normalizeOrgs([
      {
        orgId: "sandbox-org-example",
        alias: "ProductionLookingName",
        username: "user@example.com.sandbox",
        instanceUrl: "https://example--dev.sandbox.my.salesforce.com",
        isSandbox: true,
      },
    ]);
    expect(isProduction(org)).toBe(false);
  });
});
