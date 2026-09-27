import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { resolveBinary } from "../src/lib/binary";
import { magpie } from "../src/lib/exec";
import { parseAccounts, parseAgents, parseModels, parseProfiles, parseUsage } from "../src/lib/parse";

const bin = (() => {
  try {
    return resolveBinary(process.env.MAGPIE_BIN ?? "~/.local/bin/magpie");
  } catch {
    return "";
  }
})();
const live = bin !== "" && existsSync(bin);

test("live cli output parses", { skip: live ? false : "magpie is not installed" }, async () => {
  const [ls, models, profiles, usage, accounts] = await Promise.all([
    magpie(bin, ["ls"]),
    magpie(bin, ["models"]),
    magpie(bin, ["profiles"]),
    magpie(bin, ["usage", "7d"]),
    magpie(bin, ["accounts", "--json"], 20_000),
  ]);

  const agents = parseAgents(ls);
  assert.ok(agents.length > 0);
  assert.ok(agents.every((agent) => agent.id));

  const catalog = parseModels(models);
  assert.equal(catalog.empty, false);
  assert.ok(catalog.sections.some((section) => section.models.length > 0));

  const saved = parseProfiles(profiles);
  assert.equal(typeof saved.empty, "boolean");

  const report = parseUsage(usage);
  assert.equal(report.ok, true);

  const rows = parseAccounts(accounts);
  assert.ok(Array.isArray(rows));
  for (const row of rows) {
    assert.equal(typeof row.agent, "string");
    assert.equal(typeof row.user, "string");
    assert.ok(Array.isArray(row.windows));
  }
});
