import { describe, expect, it } from "vitest";
import { buildSosl, validateApiName, validateRecordId } from "../salesforce";

describe("Salesforce request builders", () => {
  it("builds escaped SOSL with per-object limits", () => {
    expect(
      buildSosl("Acme + West", [
        { apiName: "Account", fields: ["Id", "Name"], titleField: "Name", subtitleFields: [] },
        { apiName: "Custom__c", fields: ["Id", "Name", "Status__c"], titleField: "Name", subtitleFields: [] },
      ]),
    ).toBe(
      "FIND {Acme \\+ West} IN ALL FIELDS RETURNING Account(Id, Name LIMIT 20), Custom__c(Id, Name, Status__c LIMIT 20)",
    );
  });

  it("rejects invalid API names", () => {
    expect(() => validateApiName("Account")).not.toThrow();
    expect(() => validateApiName("Custom__c")).not.toThrow();
    expect(() => validateApiName("Account; DROP")).toThrow("Invalid Salesforce API name");
  });

  it("accepts only 15- and 18-character record IDs", () => {
    expect(() => validateRecordId("001000000000001")).not.toThrow();
    expect(() => validateRecordId("001000000000001AAA")).not.toThrow();
    expect(() => validateRecordId("001-not-an-id")).toThrow("15 or 18");
  });
});
