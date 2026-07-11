import { describe, expect, it } from "vitest";
import { inferIsSandbox, isProduction, normalizeOrgs } from "../orgs";

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

  it("merges CLI aliases that point to the same authenticated username", () => {
    const [org] = normalizeOrgs(
      [
        {
          orgId: "sandbox-org-example",
          alias: "JCRAN",
          username: "user@example.com.staging",
          instanceUrl: "https://example--staging.sandbox.my.salesforce.com",
          isSandbox: true,
        },
      ],
      [
        { alias: "Staging", value: "user@example.com.staging" },
        { alias: "JCRAN", value: "user@example.com.staging" },
      ],
    );

    expect(org.alias).toBe("JCRAN");
    expect(org.aliases).toEqual(["JCRAN", "Staging"]);
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

  it("recognizes legacy and login-url sandbox hosts when the CLI omits isSandbox", () => {
    expect(
      inferIsSandbox({
        orgId: "sandbox-org-example",
        username: "user@example.com.sandbox",
        instanceUrl: "https://cs99.salesforce.com",
        loginUrl: "https://test.salesforce.com",
      }),
    ).toBe(true);
  });

  it("treats an explicit CLI isSandbox value as authoritative", () => {
    expect(
      inferIsSandbox({
        orgId: "production-org-example",
        username: "user@example.com",
        instanceUrl: "https://example.sandbox.my.salesforce.com",
        isSandbox: false,
      }),
    ).toBe(false);
  });
});
