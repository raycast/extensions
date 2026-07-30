import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { STATUS_BADGES, type GeneratedCheatsheetData } from "../src/types.ts";

const dataPath = fileURLToPath(new URL("../src/data/generated.json", import.meta.url));
const data = JSON.parse(await readFile(dataPath, "utf8")) as GeneratedCheatsheetData;
const itemByUsage = (usage: string) => data.items.find((item) => item.usage === usage);

test("contains a comprehensive command catalog", () => {
  assert.ok(data.items.length >= 268, `expected at least 268 entries, received ${data.items.length}`);
});

test("contains every product category", () => {
  const expectedCategories = new Set([
    "getting-started",
    "cli",
    "slash",
    "keyboard",
    "models",
    "configuration",
    "tools",
    "skills-memory",
    "gateway",
    "automation",
    "mcp",
    "environment",
    "troubleshooting",
  ]);
  const actualCategories = new Set(data.items.map((item) => item.category));

  assert.deepEqual(actualCategories, expectedCategories);
});

test("uses unique stable IDs", () => {
  const ids = data.items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("does not show the same usage in multiple categories", () => {
  const usages = data.items.map((item) => item.usage);
  assert.equal(new Set(usages).size, usages.length);
});

test("every entry has useful, safe content", () => {
  for (const item of data.items) {
    assert.ok(item.name.trim(), `${item.id} is missing a name`);
    assert.ok(item.description.trim(), `${item.id} is missing a description`);
    assert.ok(item.usage.trim(), `${item.id} is missing usage`);
    assert.ok(item.tags.length > 0, `${item.id} is missing tags`);
    assert.match(item.documentationUrl, /^https:\/\/hermes-agent\.nousresearch\.com\/docs\//);
    for (const example of item.examples ?? []) {
      assert.ok(example.title.trim(), `${item.id} has an example without a title`);
      assert.ok(example.command.trim(), `${item.id} has an empty example command`);
      assert.notEqual(example.command, item.usage, `${item.id} duplicates its usage as an example`);
    }
    for (const status of item.statuses ?? []) {
      assert.ok(STATUS_BADGES.includes(status), `${item.id} has an unsupported status: ${status}`);
    }
  }
});

test("includes copy-ready recipes for multi-option model switching", () => {
  const modelCommand = itemByUsage("/model [model-name]");

  assert.ok(modelCommand, "missing the interactive /model command");
  assert.equal(
    modelCommand.examples?.[0]?.command,
    "/model gpt-5.6-sol --provider openai-codex --session",
    "the primary model-switch recipe must be explicitly session-scoped",
  );
  assert.ok(
    modelCommand.examples?.some((example) => example.command === "/model gpt-5.6-sol --provider openai-codex --global"),
    "missing the OpenAI Codex global model-switch example",
  );
  assert.ok((modelCommand.examples?.length ?? 0) >= 4, "expected multiple /model recipes");
});

test("includes a complete profile configuration workflow from the official profile reference", () => {
  const createProfile = itemByUsage("hermes profile create <name> [options]");
  const targetProfile = itemByUsage("hermes -p <name> <command> [options]");
  const useProfile = itemByUsage("hermes profile use <name>");

  assert.ok(createProfile, "missing profile creation reference");
  assert.equal(createProfile.id, "command-hermes-profile-create-name", "profile creation must preserve its stable ID");
  assert.match(createProfile.documentationUrl, /\/reference\/profile-commands#hermes-profile-create$/);
  assert.ok(
    createProfile.details?.parameters?.some((parameter) => parameter.name === "--clone"),
    "missing the documented --clone option",
  );
  assert.deepEqual(
    createProfile.details?.workflow?.map((step) => step.command),
    [
      "hermes profile create work --clone",
      "hermes -p work setup --portal",
      "hermes -p work config set terminal.cwd /absolute/path/to/project",
      "hermes -p work doctor",
      "hermes -p work chat",
    ],
  );
  assert.ok(createProfile.statuses?.includes("PERSISTS"));

  assert.ok(targetProfile, "missing the explicit profile selector");
  assert.ok(
    targetProfile.examples?.some((example) => example.command === "hermes -p work setup --portal"),
    "missing the profile-specific setup recipe",
  );
  assert.match(targetProfile.documentationUrl, /#hermes--p--hermes---profile$/);

  assert.equal(useProfile?.id, "command-hermes-profile-use-name", "profile selection must preserve its stable ID");
  assert.ok(useProfile?.statuses?.includes("PERSISTS"));
  assert.ok(useProfile?.examples?.some((example) => example.command === "hermes profile use default"));
});

test("records the upstream source commit", () => {
  assert.equal(data.source.repository, "https://github.com/NousResearch/hermes-agent");
  assert.match(data.source.commit, /^[a-f0-9]{40}$/);
});

test("includes current upstream commands and removes replaced billing commands", () => {
  const expectedUsages = [
    "hermes approvals",
    "hermes console",
    "hermes import-agent",
    "hermes journey",
    "hermes serve",
    "hermes skin",
    "/approvals [manual|smart|off]",
    "/context [all]",
    "/diff [staged|all|session] [--stat] [path...]",
    "/focus [on|off|status]",
    "/fast [normal|fast|status] [--global]",
    "/init [notes]",
    "/subscription",
    "/topup",
    "/update",
    "/wake [on|off|status]",
    "/whoami",
  ];
  const usages = new Set(data.items.map((item) => item.usage));

  for (const usage of expectedUsages) assert.ok(usages.has(usage), `missing current command: ${usage}`);
  assert.ok(!usages.has("/credits"), "the replaced /credits command should not remain in the catalog");
  assert.ok(!usages.has("/billing"), "the replaced /billing command should not remain in the catalog");
});

test("only exposes same-family slash recipes as copyable examples", () => {
  const slashItems = data.items.filter((item) => item.usage.startsWith("/"));

  for (const item of slashItems) {
    const command = item.usage.split(/\s+/)[0];
    for (const example of item.examples ?? []) {
      assert.equal(
        example.command.split(/\s+/)[0],
        command,
        `${item.id} exposes referenced command ${example.command} as an example`,
      );
    }
  }
});

test("records shared CLI and messaging availability from the upstream tables", () => {
  const context = itemByUsage("/context [all]");
  const init = itemByUsage("/init [notes]");
  const topup = itemByUsage("/topup");

  assert.deepEqual(context?.platforms, ["Interactive CLI", "Messaging"]);
  assert.deepEqual(init?.platforms, ["Interactive CLI", "Messaging"]);
  assert.deepEqual(topup?.platforms, ["Interactive CLI", "Messaging"]);
});

test("maps new commands to focused categories and marks evidence-backed persistence", () => {
  assert.equal(itemByUsage("hermes approvals")?.category, "configuration");
  assert.equal(itemByUsage("hermes import-agent")?.category, "configuration");
  assert.equal(itemByUsage("hermes journey")?.category, "skills-memory");
  assert.equal(itemByUsage("hermes skin")?.category, "configuration");

  assert.ok(itemByUsage("/focus [on|off|status]")?.statuses?.includes("PERSISTS"));
  assert.ok(itemByUsage("/approvals [manual|smart|off]")?.statuses?.includes("PERSISTS"));
  assert.ok(itemByUsage("/init [notes]")?.statuses?.includes("PERSISTS"));
});

test("includes the implemented global fast-mode variant missing from the prose reference", () => {
  const fast = itemByUsage("/fast [normal|fast|status] [--global]");

  assert.ok(fast?.examples?.some((example) => example.command === "/fast fast --global"));
});

test("preserves command placeholders in upstream descriptions", () => {
  assert.match(itemByUsage("/diff [staged|all|session] [--stat] [path...]")?.description ?? "", /rollback diff <N>/);
  assert.match(itemByUsage("/handoff <platform>")?.description ?? "", /resume <title>/);
  assert.match(itemByUsage("/skills")?.description ?? "", /skills diff <id>/);
});

test("includes the current egress and Slack manifest commands", () => {
  const egress = itemByUsage("hermes egress");
  const slashEgress = itemByUsage("/egress [status]");
  const egressSetup = itemByUsage("hermes egress setup [options]");
  const egressInstall = itemByUsage("hermes egress install [--force]");
  const rotateTokens = itemByUsage("hermes egress setup --rotate-tokens");
  const disableEgress = itemByUsage("hermes egress disable");
  const slackManifest = itemByUsage("hermes slack manifest [options]");

  assert.equal(egress?.category, "configuration");
  assert.match(slashEgress?.description ?? "", /Docker egress proxy status/);
  assert.deepEqual(slashEgress?.platforms, ["Interactive CLI", "Messaging"]);
  assert.equal(egressInstall?.examples?.[0]?.command, "hermes egress install");
  assert.equal(egressSetup?.examples?.[0]?.command, "hermes egress setup");
  assert.ok(
    rotateTokens?.statuses?.includes("CAUTION") &&
      rotateTokens.statuses.includes("PERSISTS") &&
      rotateTokens.statuses.includes("RESTART"),
    "missing the egress token-rotation consequences",
  );
  assert.match(rotateTokens?.warning ?? "", /invalidates the proxy tokens/i);
  assert.ok(disableEgress?.statuses?.includes("CAUTION"), "missing the egress-disable caution");
  assert.match(disableEgress?.warning ?? "", /real provider credentials/i);
  assert.match(slackManifest?.description ?? "", /--long-description-file/);
  assert.ok(
    slackManifest?.examples?.some(
      (example) => example.command === "hermes slack manifest --long-description-file AGENTS.md --write",
    ),
    "missing the Slack long-description file recipe",
  );
});

test("marks evidence-backed command consequences", () => {
  const modelCommand = itemByUsage("/model [model-name]");
  const deprecatedLogin = itemByUsage("hermes login");
  const gatewayRestart = itemByUsage("hermes gateway restart");

  assert.deepEqual(modelCommand?.statuses, ["SESSION", "CAUTION"]);
  assert.ok(deprecatedLogin?.statuses?.includes("DEPRECATED"));
  assert.ok(gatewayRestart?.statuses?.includes("RESTART"));
  assert.ok(!itemByUsage("hermes migrate")?.statuses?.includes("DEPRECATED"));
});
