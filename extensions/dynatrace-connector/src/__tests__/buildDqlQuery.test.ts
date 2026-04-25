// src/__tests__/buildDqlQuery.test.ts
// Unit tests for DQL query builder utility.

import { buildDqlQuery } from "../lib/utils/buildDqlQuery";

test("basic query with logLevel ERROR contains filter loglevel == ERROR", () => {
  const dql = buildDqlQuery({ logLevel: "error" });
  expect(dql).toContain('filter loglevel == "ERROR"');
});

test("query with logLevel WARNING contains filter loglevel == WARN", () => {
  const dql = buildDqlQuery({ logLevel: "warning" });
  expect(dql).toContain('filter loglevel == "WARN"');
});

test("query with logLevel all has no loglevel filter", () => {
  const dql = buildDqlQuery({ logLevel: "all" });
  expect(dql).not.toContain("filter loglevel");
});

test("query with serviceName adds service.name filter", () => {
  const dql = buildDqlQuery({ logLevel: "all", serviceName: "my-service" });
  expect(dql).toContain('filter service.name == "my-service"');
});

test("query with contentFilter adds matchesPhrase filter", () => {
  const dql = buildDqlQuery({ logLevel: "all", contentFilter: "NullPointerException" });
  expect(dql).toContain('filter matchesPhrase(content, "NullPointerException")');
});

test("query with before timestamp adds timestamp filter", () => {
  const before = "2026-04-19T12:00:00.000Z";
  const dql = buildDqlQuery({ logLevel: "all", before });
  expect(dql).toContain(`filter timestamp < datetime("${before}")`);
});

test("limit 50 is present by default", () => {
  const dql = buildDqlQuery({ logLevel: "error" });
  expect(dql).toContain("limit 50");
});

test("custom limit is respected", () => {
  const dql = buildDqlQuery({ logLevel: "error", limit: 100 });
  expect(dql).toContain("limit 100");
});

test("sort comes before limit in query", () => {
  const dql = buildDqlQuery({ logLevel: "error" });
  const sortIdx = dql.indexOf("sort timestamp desc");
  const limitIdx = dql.indexOf("limit");
  expect(sortIdx).toBeGreaterThan(-1);
  expect(limitIdx).toBeGreaterThan(sortIdx);
});

test("query starts with fetch logs", () => {
  const dql = buildDqlQuery({ logLevel: "all" });
  expect(dql.startsWith("fetch logs")).toBe(true);
});
