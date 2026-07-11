import { describe, expect, it } from "vitest";
import { groupSearchRecords, objectLabels } from "../search-groups";
import { SearchObjectConfig } from "../types";

const configuredObjects: SearchObjectConfig[] = [
  { apiName: "Account", fields: ["Id", "Name"], titleField: "Name", subtitleFields: [] },
  { apiName: "Contact", fields: ["Id", "Name"], titleField: "Name", subtitleFields: [] },
  { apiName: "Lead", fields: ["Id", "Name"], titleField: "Name", subtitleFields: [] },
];

describe("Salesforce search result grouping", () => {
  it("groups records by object and preserves configured object order", () => {
    const groups = groupSearchRecords(
      [
        { Id: "003000000000001", Name: "Contact One", attributes: { type: "Contact" } },
        { Id: "001000000000001", Name: "Account One", attributes: { type: "Account" } },
        { Id: "003000000000002", Name: "Contact Two", attributes: { type: "Contact" } },
      ],
      configuredObjects,
    );

    expect(groups.map((group) => [group.apiName, group.sectionTitle, group.records.length])).toEqual([
      ["Account", "Accounts", 1],
      ["Contact", "Contacts", 2],
    ]);
  });

  it("keeps custom and unknown objects visible", () => {
    const groups = groupSearchRecords(
      [{ Id: "a00000000000001", attributes: { type: "Donor_Profile__c" } }, { Id: "000000000000001" }],
      configuredObjects,
    );

    expect(groups.map((group) => [group.objectLabel, group.sectionTitle])).toEqual([
      ["Donor Profile", "Donor Profile Records"],
      ["Unknown Object", "Unknown Objects"],
    ]);
  });

  it("uses Salesforce-aware plural labels", () => {
    expect(objectLabels("Opportunity")).toEqual({ singular: "Opportunity", plural: "Opportunities" });
    expect(objectLabels("Case")).toEqual({ singular: "Case", plural: "Cases" });
  });
});
