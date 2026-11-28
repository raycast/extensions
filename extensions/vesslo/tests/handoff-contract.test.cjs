const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const contract = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/handoff-contract.js"),
);
const fixture = (name) =>
  JSON.parse(
    readFileSync(join(__dirname, "fixtures/app-integration", name), "utf8"),
  );
const now = Date.parse("2026-09-10T12:00:00Z");

test("Swift request fixture round-trips as one bounded exact Homebrew URL", () => {
  const request = fixture("request-valid.json");
  assert.deepEqual(contract.parseHandoffRequest(request), request);
  const url = contract.buildHomebrewReviewURL(request);
  assert.match(url, /^vesslo:\/\/review-homebrew\/v1\?payload=[A-Za-z0-9_-]+$/);
  assert.deepEqual(contract.parseHomebrewReviewURL(url), request);
  assert.equal(contract.handoffRequestReason(request, now), null);
  assert.equal(new URL(url).searchParams.size, 1);
});

test("historical requests remain readable while admission rejects expired and future fixtures", () => {
  for (const [file, reason] of [
    ["request-expired.json", "expired"],
    ["request-future.json", "futureRequest"],
    ["request-duplicate-cask.json", "duplicate"],
  ]) {
    const request = contract.parseHandoffRequest(fixture(file));
    assert.ok(request, file);
    assert.equal(contract.handoffRequestReason(request, now), reason);
  }
  const request = fixture("request-valid.json");
  assert.equal(contract.handoffRequestReason(request, now + 120000), null);
  assert.equal(contract.handoffRequestReason(request, now + 120001), "expired");
  assert.equal(contract.handoffRequestReason(request, now - 30000), null);
  assert.equal(
    contract.handoffRequestReason(request, now - 30001),
    "futureRequest",
  );
});

test("target validation agrees with Swift canonical cask, path, UUID and UTF8 constraints", () => {
  const target = fixture("request-valid.json").targets[0];
  for (const changes of [
    { appId: "app-1" },
    { bundleId: "" },
    { bundleId: "a".repeat(4097) },
    { bundleId: "🙂".repeat(1025) },
    { bundleId: "broken\ud800" },
    { installedVersion: "1\n2" },
    { expectedTargetVersion: "2\u202e0" },
    { canonicalPath: "Applications/X.app" },
    { canonicalPath: "/Applications/../X.app" },
    { canonicalPath: "/Applications//X.app" },
    { canonicalPath: "/Applications/./X.app" },
    { canonicalPath: "/Applications/X.app/" },
    { canonicalPath: "/Applications/X.APP" },
    { canonicalPath: "/Applications/X.app\0" },
    { caskToken: "Example" },
    { caskToken: "example.app" },
    { caskToken: " example" },
    { caskToken: "tap/cask/a/b" },
    { caskToken: "$(id)" },
    { caskToken: "example;echo" },
  ])
    assert.equal(
      contract.parseHandoffTarget({ ...target, ...changes }),
      null,
      JSON.stringify(changes),
    );
  for (const changes of [
    { appId: target.appId.toUpperCase() },
    { caskToken: "owner/tap/cask@2+1" },
    { canonicalPath: "/Applications/한글 ' $(literal).app" },
    { bundleId: "🙂".repeat(1024) },
    { installedVersion: "1\u20282" },
  ])
    assert.ok(
      contract.parseHandoffTarget({ ...target, ...changes }),
      JSON.stringify(changes),
    );
});

test("ISO dates validate calendar and offsets without Date.parse rollover acceptance", () => {
  for (const date of [
    "2026-02-29T12:00:00Z",
    "2026-13-01T12:00:00Z",
    "2026-09-10",
    "2026-09-10T24:00:00Z",
    "2026-09-10T12:00:00+99:99",
    "2026-09-10T12:00:00Zjunk",
  ])
    assert.equal(contract.isHandoffISODate(date), false, date);
  for (const date of [
    "2024-02-29T12:00:00Z",
    "2026-09-10T12:00:00.000Z",
    "2026-09-10T21:00:00+09:00",
  ])
    assert.equal(contract.isHandoffISODate(date), true, date);
});

test("requests reject unsupported schema/source and unsafe or malformed revisions", () => {
  const request = fixture("request-valid.json");
  for (const changes of [
    { schemaVersion: 2 },
    { schemaVersion: "1" },
    { source: "Brew" },
    { requestId: "bad" },
    { publisherSessionId: "bad" },
    { inventoryRevision: -1 },
    { inventoryRevision: 1.5 },
    { inventoryRevision: Number.MAX_SAFE_INTEGER + 1 },
    { completedCheckRevision: "11" },
    { targets: [] },
    { targets: Array(17).fill(request.targets[0]) },
  ])
    assert.equal(
      contract.parseHandoffRequest({ ...request, ...changes }),
      null,
      JSON.stringify(changes),
    );
});

test("UUID duplicates are case insensitive while shared Bundle IDs alone are allowed", () => {
  const request = fixture("request-valid.json");
  request.targets[0].appId = "abcdefab-1111-1111-1111-111111111111";
  request.targets[1].appId = request.targets[0].appId.toUpperCase();
  assert.equal(contract.handoffRequestReason(request, now), "duplicate");
  const different = fixture("request-valid.json");
  different.targets[1].bundleId = different.targets[0].bundleId;
  assert.equal(contract.handoffRequestReason(different, now), null);
});

test("URL parser refuses query widening, broad routes, credentials and permissive base64 variants", () => {
  const url = contract.buildHomebrewReviewURL(fixture("request-valid.json"));
  for (const altered of [
    url + "=",
    url + "&other=1",
    url + "&payload=x",
    url + "#fragment",
    url.replace("review-homebrew", "user@review-homebrew"),
    url.replace("/v1?", ":123/v1?"),
    url.replace("/v1?", "/v2?"),
    url.replace("vesslo:", "https:"),
    "vesslo://update-all",
    "vesslo://update/com.example.editor",
    url + "!",
    "vesslo://review-homebrew/v1?payload=A",
    "vesslo://review-homebrew/v1?payload=_w",
  ])
    assert.equal(
      contract.parseHomebrewReviewURL(altered),
      null,
      altered.slice(0, 90),
    );
});

test("payload and URL size limits are enforced independently", () => {
  const request = fixture("request-valid.json");
  request.targets = Array.from({ length: 16 }, (_, index) => ({
    ...request.targets[0],
    appId: `aaaaaaaa-aaaa-aaaa-aaaa-${String(index).padStart(12, "0")}`,
    canonicalPath: `/Applications/Example${index}.app`,
    caskToken: `example-${index}`,
    installedVersion: "a".repeat(4096),
  }));
  assert.equal(contract.parseHandoffRequest(request), null);
  assert.throws(() => contract.buildHomebrewReviewURL(request), /oversized/);
  assert.equal(
    contract.parseHomebrewReviewURL(
      "vesslo://review-homebrew/v1?payload=" + "A".repeat(32768),
    ),
    null,
  );
});

const { requestV2Fixture } = require("./helpers/readiness-fixture.cjs");

test("v2 exact request retains every proof UUID through its matched v2 URL", () => {
  const request = requestV2Fixture();
  assert.deepEqual(contract.parseHandoffRequest(request), request);
  const url = contract.buildHomebrewReviewURL(request);
  assert.match(url, /^vesslo:\/\/review-homebrew\/v2\?payload=/);
  assert.deepEqual(contract.parseHomebrewReviewURL(url), request);
  assert.equal(contract.handoffRequestReason(request, now), null);
  assert.equal(
    contract.parseHomebrewReviewURL(url.replace("/v2?", "/v1?")),
    null,
  );
  for (const change of [undefined, null, "bad", "", 1]) {
    const malformed = requestV2Fixture();
    malformed.targets[0].readinessEvidenceId = change;
    assert.equal(contract.parseHandoffRequest(malformed), null);
  }
});

test("v2 proof authority is neither stripped into v1 nor duplicated within a request", () => {
  const request = requestV2Fixture();
  assert.equal(
    contract.parseHandoffRequest({ ...request, schemaVersion: 1 }),
    null,
  );
  request.targets[1].readinessEvidenceId =
    request.targets[0].readinessEvidenceId.toUpperCase();
  assert.equal(contract.handoffRequestReason(request, now), "duplicate");
  request.targets[1].readinessEvidenceId =
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  assert.equal(contract.handoffRequestReason(request, now), null);
});

const appFixtures = require("./helpers/app-readiness-fixture.cjs");
for (const entry of appFixtures.manifest.entries.filter(
  (entry) => entry.kind === "request",
)) {
  test(`app-owned request fixture retains its original wire authority: ${entry.file}`, () => {
    const raw = appFixtures.fixture(entry.file);
    const request = contract.parseHandoffRequest(raw);
    if (entry.expected.requestValidation === "sourceUnverified") {
      assert.equal(request, null);
      return;
    }
    assert.deepEqual(request, raw);
    assert.deepEqual(
      contract.parseHomebrewReviewURL(contract.buildHomebrewReviewURL(request)),
      raw,
    );
    if (entry.expected.requestValidation === "unsupportedVersion") {
      assert.equal(request.schemaVersion, 1);
      assert.equal(appFixtures.fixture(entry.metadataFile).schemaVersion, 3);
      assert.equal(
        appFixtures
          .fixture(entry.metadataFile)
          .capabilities.includes("homebrewReviewV1"),
        false,
      );
      return;
    }
    assert.equal(request.schemaVersion, 2);
    assert.equal(
      contract.handoffRequestReason(request, appFixtures.fixtureClock),
      entry.expected.requestValidation === "duplicate" ? "duplicate" : null,
    );
  });
}
