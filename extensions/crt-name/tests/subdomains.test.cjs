const assert = require("node:assert/strict");
const { test } = require("node:test");
const { resolve } = require("node:path");
const { loadModule } = require("./load-module.cjs");

const { filterSubdomains, normalizeRecords, sortSubdomains, subdomainsToClipboard } = loadModule(
  resolve(__dirname, "../src/subdomains.ts"),
  {},
);

test("duplicate index records retain the earliest valid instant, including offset timestamps", () => {
  const records = normalizeRecords([
    { subdomain: " API.Example.COM. ", firstSeen: null },
    { subdomain: "api.example.com", firstSeen: "2024-01-01T01:00:00+02:00" },
    { subdomain: "api.example.com", firstSeen: "2024-01-01T00:00:00Z" },
    { subdomain: "api.example.com", firstSeen: "invalid" },
    { subdomain: "API.EXAMPLE.COM", firstSeen: null },
    { subdomain: "unknown.example.com", firstSeen: "invalid" },
    { subdomain: " ", firstSeen: null },
  ]);
  assert.deepEqual(records, [
    { subdomain: "api.example.com", firstSeen: "2023-12-31T23:00:00.000Z" },
    { subdomain: "unknown.example.com", firstSeen: null },
  ]);
});

test("wildcard patterns remain distinct from the apex and concrete hostnames", () => {
  const records = normalizeRecords([
    { subdomain: "*.Example.com", firstSeen: null },
    { subdomain: "*.example.com", firstSeen: "2020-01-01T00:00:00Z" },
    { subdomain: "example.com", firstSeen: null },
    { subdomain: "www.example.com", firstSeen: null },
  ]);
  assert.equal(records.length, 3);
  assert.equal(records[0].subdomain, "*.example.com");
  assert.equal(subdomainsToClipboard(records), "*.example.com\nexample.com\nwww.example.com");
});

test("date sorting compares full instants, breaks ties alphabetically, and always puts unknowns last", () => {
  const records = [
    { subdomain: "z.example.com", firstSeen: null },
    { subdomain: "b.example.com", firstSeen: "2024-01-01T00:00:00Z" },
    { subdomain: "a.example.com", firstSeen: "2023-12-31T19:00:00-05:00" },
    { subdomain: "old.example.com", firstSeen: "2024-01-01T00:30:00+01:00" },
    { subdomain: "new.example.com", firstSeen: "2024-01-01T00:00:00.001Z" },
    { subdomain: "y.example.com", firstSeen: "invalid" },
  ];
  const names = (sort) => sortSubdomains(records, sort).map((r) => r.subdomain);
  assert.deepEqual(names("first-seen-ascending"), [
    "old.example.com",
    "a.example.com",
    "b.example.com",
    "new.example.com",
    "y.example.com",
    "z.example.com",
  ]);
  assert.deepEqual(names("first-seen-descending"), [
    "new.example.com",
    "a.example.com",
    "b.example.com",
    "old.example.com",
    "y.example.com",
    "z.example.com",
  ]);
  assert.deepEqual(names("alphabetical"), [
    "a.example.com",
    "b.example.com",
    "new.example.com",
    "old.example.com",
    "y.example.com",
    "z.example.com",
  ]);
  assert.equal(records[0].subdomain, "z.example.com", "sorting must not mutate cached records");
});

test("copy all includes results beyond the page and outside the filter, in the selected order", () => {
  const results = sortSubdomains(
    normalizeRecords(
      Array.from({ length: 205 }, (_, i) => ({
        subdomain: `host-${String(i).padStart(3, "0")}.example.com`,
        firstSeen: new Date(Date.UTC(2020, 0, 1, 0, 0, i)).toISOString(),
      })),
    ),
    "first-seen-descending",
  );
  const filtered = filterSubdomains(results, " HOST-00 ");
  assert.equal(filtered.length, 10);
  const copied = subdomainsToClipboard(results).split("\n");
  assert.equal(copied.length, 205);
  assert.equal(copied[0], "host-204.example.com");
  assert.equal(copied.at(-1), "host-000.example.com");
  assert.ok(copied.includes("host-100.example.com"));
  assert.equal(new Set(copied).size, 205);
  assert.ok(copied.every((line) => !line.includes("https://") && !line.includes("2020")));
});

test("empty results copy to an empty string and a nonmatching filter stays empty", () => {
  assert.equal(subdomainsToClipboard([]), "");
  assert.deepEqual(sortSubdomains([], "first-seen-ascending"), []);
  assert.deepEqual(filterSubdomains([{ subdomain: "api.example.com", firstSeen: null }], "missing"), []);
});

test("malformed and impossible dates are unknown rather than invented history", () => {
  for (const firstSeen of ["2024-02-30T00:00:00Z", "123", "2024-01-01", "not a timestamp", ""]) {
    assert.equal(normalizeRecords([{ subdomain: "api.example.com", firstSeen }])[0].firstSeen, null);
  }
});
