import { describe, expect, it } from "vitest";
import { parseAdditionalObjects } from "../preferences";

describe("additional object configuration", () => {
  it("parses valid custom objects and fields", () => {
    expect(parseAdditionalObjects("Research__c(Name,Status__c);Work__c(Title__c)")).toEqual([
      {
        apiName: "Research__c",
        fields: ["Id", "Name", "Status__c"],
        titleField: "Name",
        subtitleFields: ["Status__c"],
      },
      {
        apiName: "Work__c",
        fields: ["Id", "Title__c"],
        titleField: "Title__c",
        subtitleFields: [],
      },
    ]);
  });

  it("ignores invalid API names and field paths", () => {
    expect(parseAdditionalObjects("Bad-Object(Name);Safe__c(Name,Oops!);Another__c")).toEqual([
      { apiName: "Safe__c", fields: ["Id", "Name"], titleField: "Name", subtitleFields: [] },
      { apiName: "Another__c", fields: ["Id", "Name"], titleField: "Name", subtitleFields: [] },
    ]);
  });
});
