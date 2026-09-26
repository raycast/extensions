const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const fixtureClock = Date.parse("2026-09-10T12:00:00Z");
const directory = join(__dirname, "../fixtures/app-integration");
const read = (name) => JSON.parse(readFileSync(join(directory, name), "utf8"));

// Extension-owned synthetic cases; the original app-owned v1 fixtures stay unchanged.
function schema3Fixture() {
  const data = read("ready.json");
  data.schemaVersion = 3;
  data.capabilities = [
    "homebrewReviewV2",
    "homebrewTargetReadinessV1",
    "requestReceiptsV2",
  ];
  data.completedInventoryRevision = data.inventoryRevision;
  data.homebrewReadiness = data.apps.map((app, index) => ({
    target: {
      appId: app.id,
      bundleId: app.bundleId,
      canonicalPath: app.path,
      caskToken: app.homebrewCask,
      installedVersion: app.version,
      expectedTargetVersion: app.targetVersion,
    },
    source: "homebrew",
    state: "ready",
    evidenceId: `aaaaaaaa-aaaa-aaaa-aaaa-${String(index + 1).padStart(12, "0")}`,
    publisherSessionId: data.publisherSessionId,
    checkRevision: data.checkRevision,
    inventoryRevision: data.inventoryRevision,
    checkedAt: data.lastUpdateCheckAt,
    expiresAt: "2026-09-10T12:15:00Z",
  }));
  return data;
}

function requestV2Fixture() {
  const request = read("request-valid.json");
  const data = schema3Fixture();
  request.schemaVersion = 2;
  request.targets = data.homebrewReadiness.map((evidence) => ({
    ...evidence.target,
    readinessEvidenceId: evidence.evidenceId,
  }));
  return request;
}

function receiptV2Fixture(name = "receipt-accepted.json") {
  const envelope = read(name);
  envelope.schemaVersion = 2;
  const receipt = envelope.receipts[0];
  receipt.schemaVersion = 2;
  receipt.request = requestV2Fixture();
  receipt.targets = receipt.targets.map((target, index) => ({
    ...target,
    target: { ...receipt.request.targets[index] },
  }));
  return envelope;
}

module.exports = {
  schema3Fixture,
  requestV2Fixture,
  receiptV2Fixture,
  fixtureClock,
};
