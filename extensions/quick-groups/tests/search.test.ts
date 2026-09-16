import { describe, expect, it } from "vitest";
import { parseReferenceYaml } from "../src/parser";
import { buildSearchIndex, searchRecords } from "../src/search";

const records = parseReferenceYaml(
  `
machines:
  dev:
    ip: 192.168.1.20
    proxmox:
      value: 192.168.1.46
      ssh: root@192.168.1.46
      open: https://192.168.1.46:8006
    api_token: swordfish
    login:
      value: admin
      pwd: even-more-secret
    dashboard:
      value: 192.168.1.46
      open: https://\${value}:9443
`,
  "machines.yaml",
).records;
const index = buildSearchIndex(records);

describe("searchRecords", () => {
  it.each([".20", ".46", "168.1.46", "8006", "root@", "machines", "proxmox"])(
    "matches substring %s",
    (query) => {
      expect(searchRecords(index, query)).toHaveLength(1);
    },
  );

  it("does not index sensitive values", () => {
    expect(searchRecords(index, "swordfish")).toHaveLength(0);
    expect(searchRecords(index, "api_token")).toHaveLength(1);
    expect(records[0].fields.find((field) => field.label === "api_token")?.sensitive).toBe(true);
  });

  it("does not index pwd action targets", () => {
    expect(searchRecords(index, "even-more-secret")).toHaveLength(0);
    expect(searchRecords(index, "admin")).toHaveLength(1);
  });

  it("indexes resolved action targets", () => {
    expect(searchRecords(index, "9443")).toHaveLength(1);
  });
});
