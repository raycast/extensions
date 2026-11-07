import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { resolveBinary } from "../src/lib/binary";
import { magpie } from "../src/lib/exec";
import {
  modelLabel,
  parseAccounts,
  parseAgents,
  parseModels,
  parseProfiles,
  parseQuotas,
  parseSessions,
  parseUsage,
  sameModel,
} from "../src/lib/parse";

const bin = (() => {
  try {
    return resolveBinary(process.env.MAGPIE_BIN ?? "~/.local/bin/magpie");
  } catch {
    return "";
  }
})();
const live = bin !== "" && existsSync(bin);

test(
  "live cli output parses",
  { skip: live ? false : "magpie is not installed" },
  async () => {
    const [ls, models, profiles, usage, accounts, quotas, sessions] =
      await Promise.all([
        magpie(bin, ["ls"]),
        magpie(bin, ["models"]),
        magpie(bin, ["profiles"]),
        magpie(bin, ["usage", "7d"]),
        magpie(bin, ["accounts", "--json"], 20_000),
        magpie(bin, ["quota", "--json"], 20_000),
        magpie(bin, ["sessions", "--json"], 20_000),
      ]);

    const agents = parseAgents(ls);
    assert.ok(agents.length > 0);
    const unmapped = agents
      .filter((agent) => !agent.id)
      .map((agent) => agent.name);
    assert.deepEqual(unmapped, []);
    for (const agent of agents) {
      if (!agent.context) continue;
      assert.match(agent.model, /\[([^\]]+)\]$/);
      assert.equal(sameModel(agent.model, modelLabel(agent.model)), true);
    }

    const catalog = parseModels(models);
    assert.equal(catalog.empty, false);
    assert.ok(catalog.sections.some((section) => section.models.length > 0));
    const catalogIds = new Set(
      catalog.sections.flatMap((section) =>
        section.models.map((model) => model.id),
      ),
    );
    for (const agent of agents) {
      const id = modelLabel(agent.model).replace(/^magpie\//, "");
      if (!id.includes("/")) continue;
      assert.equal(
        sameModel(agent.model, id),
        true,
        `${agent.name} model ${agent.model}`,
      );
      if (catalogIds.has(id)) {
        assert.equal(
          catalog.sections.some((section) =>
            section.models.some((model) => sameModel(agent.model, model.id)),
          ),
          true,
        );
      }
    }

    const saved = parseProfiles(profiles);
    assert.equal(typeof saved.empty, "boolean");

    assertUsage(usage);

    const rows = parseAccounts(accounts);
    assert.ok(Array.isArray(rows));
    for (const row of rows) {
      assert.equal(typeof row.agent, "string");
      assert.equal(typeof row.user, "string");
      assert.ok(Array.isArray(row.windows));
    }

    const quotaRows = parseQuotas(quotas);
    for (const row of quotaRows) {
      assert.equal(typeof row.provider, "string");
      assert.ok(row.provider.length > 0);
      assert.ok(Array.isArray(row.windows));
    }

    const sessionRows = parseSessions(sessions);
    for (const row of sessionRows) {
      assert.equal(typeof row.agent, "string");
      assert.equal(typeof row.id, "string");
      assert.ok(row.id.length > 0);
      assert.ok(Array.isArray(row.models));
    }
  },
);

function assertUsage(stdout: string) {
  const report = parseUsage(stdout);
  assert.equal(report.ok, true, "could not parse live usage output");
  const hasTotal = /^\S+ tokens? .+ · \d+ calls? · /m.test(stdout);
  assert.equal(report.ok && !report.empty, hasTotal);
  if (!report.ok || report.empty) return;
  const tables = [report, ...(report.local ? [report.local] : [])];
  for (const table of tables) {
    assert.ok(table.agents.length > 0);
    assert.ok(table.models.length > 0);
    if (/^\s*sessions(?:\s+·|\s*$)/m.test(table.raw)) {
      assert.ok(table.sessions.length > 0, "session table was lost");
    }
    assert.ok(
      table.models.every((row) => !/\b[0-9a-f]{8}-[0-9a-f]{4}-/.test(row.name)),
      "session ids leaked into model rows",
    );
  }
  if (stdout.includes("not through magpie ·")) {
    assert.ok(tables.some((table) => table.source === "local"));
  }
}

for (const period of ["today", "30d", "all"]) {
  test(
    `live usage ${period} parses`,
    { skip: live ? false : "magpie is not installed" },
    async () => {
      assertUsage(await magpie(bin, ["usage", period]));
    },
  );
}
