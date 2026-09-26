const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const directory = join(__dirname, "../fixtures/app-readiness-v2");
const read = (name) => readFileSync(join(directory, name), "utf8");
const fixture = (name) => JSON.parse(read(name));
const manifest = fixture("manifest.json");
const fixtureClock = Date.parse(manifest.fixtureClock);

module.exports = { directory, read, fixture, manifest, fixtureClock };
