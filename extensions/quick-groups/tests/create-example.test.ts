import { describe, expect, it } from "vitest";
import { EXAMPLE_YAML } from "../src/create-example";
import { parseReferenceYaml } from "../src/parser";

describe("example YAML", () => {
  it("is valid and demonstrates resolved actions", () => {
    const result = parseReferenceYaml(EXAMPLE_YAML, "quick-groups-example.yaml");
    expect(result.diagnostics).toEqual([]);
    expect(result.records[0].fields[1].actions).toContainEqual({
      kind: "ssh",
      target: "root@192.168.1.46",
    });
    expect(result.records[1].fields[0]).toMatchObject({ effectiveValue: "~" });
  });
});
