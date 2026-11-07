import { describe, expect, test } from "bun:test";
import { keywordsForRow, parsePortQuery, rowMatchesQuery, searchRows, searchHaystack } from "../src/lib/search";
import type { AppRow, Helper } from "../src/lib/types";

const MIB = 1024 * 1024;

const row = (over: Partial<AppRow> = {}): AppRow => ({
  id: "g1",
  identity: "app:/Applications/Google Chrome.app",
  snapshotToken: "t1",
  name: "Google Chrome",
  path: "/Applications/Google Chrome.app",
  pid: 1287,
  allPids: [1287, 1301],
  cpu: 12,
  memBytes: 2400 * MIB,
  procs: 2,
  helpers: [],
  ports: [],
  protected: false,
  kind: "app",
  hasWindow: true,
  ...over,
});

const helper = (over: Partial<Helper> = {}): Helper => ({
  name: "node", role: "Child", cpu: 1, memBytes: MIB, pid: 4321, ...over,
});

describe("parsePortQuery", () => {
  test("8101 / :8101 命中，其余非法", () => {
    expect(parsePortQuery("8101")).toBe(8101);
    expect(parsePortQuery(" :8101 ")).toBe(8101);
    expect(parsePortQuery("0")).toBeNull();
    expect(parsePortQuery("65536")).toBeNull();
    expect(parsePortQuery("chrome")).toBeNull();
    expect(parsePortQuery("81a1")).toBeNull();
  });
});

describe("rowMatchesQuery 端口命中", () => {
  test("组端口 / Helper 端口 / 命令行声明端口", () => {
    expect(rowMatchesQuery(row({ ports: [8101] }), "8101")).toBe(true);
    expect(rowMatchesQuery(row({ ports: [8101] }), ":8101")).toBe(true);
    expect(rowMatchesQuery(row({ ports: [8101] }), "3000")).toBe(false);

    const withHelper = row({ helpers: [helper({ ports: [3000] })] });
    expect(rowMatchesQuery(withHelper, "3000")).toBe(true);

    const declared = row({ commandLine: "/usr/bin/java -jar app.jar --server.port=8080" });
    expect(rowMatchesQuery(declared, "8080")).toBe(true);
    expect(rowMatchesQuery(declared, "8081")).toBe(false);
  });
});

describe("rowMatchesQuery 文本命中", () => {
  test("名称 / 路径 / PID / Helper 名，大小写与分隔符不敏感", () => {
    expect(rowMatchesQuery(row(), "chrome")).toBe(true);
    expect(rowMatchesQuery(row(), "GOOGLE")).toBe(true);
    expect(rowMatchesQuery(row(), "1287")).toBe(true);
    expect(rowMatchesQuery(row(), "applications")).toBe(true);
    expect(rowMatchesQuery(row({ helpers: [helper()] }), "node")).toBe(true);
    expect(rowMatchesQuery(row(), "safari")).toBe(false);
  });

  test("多词 AND，中文可子串命中", () => {
    expect(rowMatchesQuery(row(), "google chrome")).toBe(true);
    expect(rowMatchesQuery(row(), "chrome safari")).toBe(false);
    expect(rowMatchesQuery(row({ name: "企业微信" }), "企业")).toBe(true);
    expect(rowMatchesQuery(row({ name: "企业微信" }), "微信")).toBe(true);
  });

  test("空 query 全通过", () => {
    expect(rowMatchesQuery(row(), "  ")).toBe(true);
    expect(searchRows([row(), row({ id: "g2", name: "Safari" })], "safari")).toHaveLength(1);
  });
});

describe("searchHaystack / keywordsForRow", () => {
  test("haystack 覆盖名称/路径/PID/命令行/Helper", () => {
    const haystack = searchHaystack(row({ commandLine: "chrome --flag", helpers: [helper()] }));
    for (const needle of ["Google Chrome", "/Applications/Google Chrome.app", "1287", "chrome --flag", "node"]) {
      expect(haystack).toContain(needle);
    }
  });

  test("keywords 带出所有 PID 与端口（含 : 前缀）", () => {
    const keywords = keywordsForRow(row({ ports: [8101], helpers: [helper({ ports: [3000] })] }));
    expect(keywords).toContain("1301");
    expect(keywords).toContain("8101");
    expect(keywords).toContain(":8101");
    expect(keywords).toContain("3000");
  });

  test("keywords 带出命令行声明端口（含 : 前缀）、bundle、路径与 helper 名", () => {
    const declared = row({
      path: "/Applications/Google Chrome.app",
      iconPath: "/Applications/Google Chrome.app",
      commandLine: "/usr/bin/java -jar app.jar --server.port=8080 -Dserver.port=9090",
      helpers: [helper({ name: "Chrome Helper", role: "GPU", pid: 9999 })],
    });
    const keywords = keywordsForRow(declared);
    expect(keywords).toContain("8080");
    expect(keywords).toContain(":8080");
    expect(keywords).toContain("9090");
    expect(keywords).toContain(":9090");
    expect(keywords).toContain("/Applications/Google Chrome.app");
    expect(keywords).toContain("Chrome Helper");
    expect(keywords).toContain("GPU");
    expect(keywords).toContain("9999");
  });
});
