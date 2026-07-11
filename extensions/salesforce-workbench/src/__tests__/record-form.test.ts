import { describe, expect, it } from "vitest";
import { buildPayload, editableFields } from "../components/DynamicRecordForm";
import { DescribeField, DescribeResult } from "../types";

const field = (overrides: Partial<DescribeField>): DescribeField => ({
  name: "Name",
  label: "Name",
  type: "string",
  createable: true,
  updateable: true,
  nillable: true,
  defaultedOnCreate: false,
  ...overrides,
});

describe("dynamic record form payloads", () => {
  it("serializes typed values and multipicklists", () => {
    const fields = [
      field({ name: "Amount__c", label: "Amount", type: "currency" }),
      field({ name: "Active__c", label: "Active", type: "boolean" }),
      field({ name: "Tags__c", label: "Tags", type: "multipicklist" }),
    ];
    expect(
      buildPayload(
        fields,
        ["Amount__c", "Active__c", "Tags__c"],
        [],
        { Amount__c: "12.50", Active__c: true, Tags__c: ["One", "Two"] },
        "update",
      ),
    ).toEqual({ Amount__c: 12.5, Active__c: true, Tags__c: "One;Two" });
  });

  it("distinguishes clearing a field from an empty string", () => {
    const fields = [field({ name: "Description", label: "Description", type: "textarea" })];
    expect(buildPayload(fields, ["Description"], [], { Description: "" }, "update")).toEqual({ Description: "" });
    expect(buildPayload(fields, [], ["Description"], {}, "update")).toEqual({ Description: null });
  });

  it("enforces required create fields and maximum length", () => {
    const required = field({ nillable: false, length: 5 });
    expect(() => buildPayload([required], ["Name"], [], { Name: "" }, "create")).toThrow("required");
    expect(() => buildPayload([required], ["Name"], [], { Name: "Too long" }, "create")).toThrow("5 characters");
  });

  it("keeps supported fields even when Salesforce identifies a compound parent", () => {
    const name = field({ name: "Name", label: "Account Name", compoundFieldName: "Name", nillable: false });
    const address = field({ name: "BillingStreet", label: "Billing Street", compoundFieldName: "BillingAddress" });
    const unsupported = field({ name: "BillingAddress", label: "Billing Address", type: "address" });
    const describe = {
      name: "Account",
      label: "Account",
      labelPlural: "Accounts",
      queryable: true,
      searchable: true,
      createable: true,
      updateable: true,
      deletable: true,
      fields: [name, address, unsupported],
    } satisfies DescribeResult;
    expect(editableFields(describe, "create").map((candidate) => candidate.name)).toEqual(["Name", "BillingStreet"]);
  });
});
