const { createHash } = require("node:crypto");
const source = require("./fixtures/app-integration/ready.json");
function uuid(value) {
  const h = createHash("sha256").update(value).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
function schema2Data(apps, overrides = {}) {
  const timestamp = new Date().toISOString();
  return {
    ...source,
    exportedAt: timestamp,
    lastUpdateCheckAt: timestamp,
    apps,
    updateCount: apps.filter((a) => a.isVisibleInUpdates === true).length,
    ...overrides,
  };
}
module.exports = { schema2Data, uuid };
