import { describe, expect, it } from "vitest";
import { groupFields } from "../src/browse-index";
import { parseReferenceYaml } from "../src/parser";

describe("groupFields", () => {
  it("derives sorted field groups and preserves record order within each group", () => {
    const records = parseReferenceYaml(
      `
machines:
  dev:
    ip: 10.0.0.1
    model: EQR5
  staging:
    ip: 10.0.0.2
services:
  dns:
    host: 10.0.0.3
`,
      "reference.yaml",
    ).records;
    const groups = groupFields(records);
    expect(groups.map((group) => group.label)).toEqual(["host", "ip", "model"]);
    expect(
      groups.find((group) => group.label === "ip")?.occurrences.map(({ record }) => record.name),
    ).toEqual(["dev", "staging"]);
  });
});
