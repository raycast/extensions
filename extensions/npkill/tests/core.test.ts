import assert from "node:assert/strict";
import test from "node:test";
import { homedir } from "node:os";
import { LineBuffer, parseRecord, parseStderr } from "../src/services/json-stream";
import { buildArguments, validateVersions } from "../src/services/npkill-cli";
import { planCleanup } from "../src/services/cleanup";
import { estimatedTotal, formatActivity, formatSize, visibleArtifacts } from "../src/utils/artifacts";
import { Artifact, ScanOptions } from "../src/types";

const output = {
  version: 1,
  result: {
    path: "/Projects/雪 day/node_modules",
    size: 123,
    projectModificationTime: 1700000000000,
    riskAnalysis: { isSensitive: false },
  },
};
test("NDJSON handles partial records, CRLF, multiple records, and final line without newline", () => {
  const records: unknown[] = [];
  const parser = new LineBuffer((line) => records.push(parseRecord(line)));
  const json = JSON.stringify(output);
  parser.write(json.slice(0, 19));
  assert.equal(records.length, 0);
  parser.write(json.slice(19) + "\r\n\n" + json + "\n" + json.slice(0, 12));
  assert.equal(records.length, 2);
  parser.write(json.slice(12));
  parser.end();
  assert.equal(records.length, 3);
  assert.equal((records[0] as Artifact).path, output.result.path);
});

test("schema validation rejects malformed, incompatible, deletion, and invalid field data", () => {
  for (const value of [
    "not JSON",
    "null",
    JSON.stringify({ ...output, version: 2 }),
    ...[
      { size: -1 },
      { size: "10" },
      { path: "relative/node_modules" },
      { projectModificationTime: -1 },
      { projectModificationTime: 1 },
      { projectModificationTime: undefined, modificationTime: 1700000000000 },
      { riskAnalysis: { isSensitive: "false" } },
      { deletion: { success: true } },
    ].map((changes) => JSON.stringify({ ...output, result: { ...output.result, ...changes } })),
  ])
    assert.throws(() => parseRecord(value));
});

test("unknown size, activity, and risk remain unknown", () => {
  const record = parseRecord(
    JSON.stringify({ version: 1, result: { path: "/x/node_modules", size: null, projectModificationTime: null } }),
  );
  assert.equal(record.risk, "unknown");
  assert.equal(record.activity, null);
  assert.equal(formatActivity(record.activity), "Unknown");
  assert.equal(formatSize(record.size), "Unknown size");
  assert.equal(estimatedTotal([record]), "0 B estimated + 1 unknown");
});

test("stderr preserves affected paths and handles non-JSON runtime failures", () => {
  assert.equal(
    parseStderr('{"version":1,"error":true,"message":"Permission denied: /private/project"}'),
    "Permission denied: /private/project",
  );
  assert.equal(parseStderr("\x1b[31mInvalid profile\x1b[0m"), "Invalid profile");
  assert.throws(() => new LineBuffer(() => {}).write("x".repeat(1024 * 1024 + 1)), /too large/);
});

test("CLI uses separate arguments, multiple profiles, exclusions, and read-only flags", () => {
  const options: ScanOptions = {
    root: "/Projects/雪 $(touch nope)",
    profiles: "node, python",
    executable: "",
    config: "/Projects/my config",
    exclusions: "**/work/**\n**/keep/**",
    includeSensitive: false,
  };
  const args = buildArguments(options);
  assert.deepEqual(args, [
    "--directory",
    options.root,
    "--profiles",
    "node,python",
    "--json-stream",
    "--dry-run",
    "--config",
    options.config,
    "--exclude",
    "**/work/**,**/keep/**",
  ]);
  assert.ok(!args.includes("--delete-all"));
  assert.ok(!args.includes("--yes"));
  assert.throws(() => buildArguments({ ...options, profiles: "--delete-all; bash" }));
  assert.throws(() => buildArguments({ ...options, config: "relative" }));
});

test("version compatibility gates Node and npkill majors", () => {
  validateVersions("v20.19.0", "v1.0.0");
  validateVersions("v24.12.0", "1.2.3");
  for (const pair of [
    ["v20.18.9", "v1.0.0"],
    ["v18.20.0", "v1.0.0"],
    ["v24.0.0", "v0.12.2"],
    ["v24.0.0", "v2.0.0"],
    ["v24.0.0", "v1.0.0-beta"],
  ])
    assert.throws(() => validateVersions(pair[0], pair[1]));
});

function artifact(path: string, size: number | null, activity: number | null): Artifact {
  return { path, size, activity, risk: "review", identity: [] };
}
test("age filters exclude unknowns and size/activity sorts put unknowns last", () => {
  const now = 1800000000000;
  const items = [
    artifact("/a", null, null),
    artifact("/b", 1024 ** 3 + 1, now - 181 * 86400000),
    artifact("/c", 10, now),
  ];
  assert.deepEqual(
    visibleArtifacts(items, "", "days90", "oldest", now).map((r) => r.path),
    ["/b"],
  );
  assert.deepEqual(
    visibleArtifacts(items, "", "all", "smallest", now).map((r) => r.path),
    ["/c", "/b", "/a"],
  );
  assert.deepEqual(
    visibleArtifacts(items, "", "gb", "path", now).map((r) => r.path),
    ["/b"],
  );
  assert.deepEqual(
    visibleArtifacts(items, "/C", "all", "path", now).map((r) => r.path),
    ["/c"],
  );
  assert.equal(formatSize(1024 ** 3), "1 GB");
  assert.equal(formatSize(0), "0 B");
});

test("batch plans never include filtered or hidden selected results", () => {
  const items = [artifact("/Projects/one/node_modules", 100, null), artifact("/Projects/two/node_modules", 100, null)];
  const visible = visibleArtifacts(items, "one", "all", "path");
  assert.deepEqual(planCleanup(visible, new Set(items.map((item) => item.path))), [items[0]]);
});

test("5,000 streamed candidates remain searchable and sortable", () => {
  const items = Array.from({ length: 5000 }, (_, index) =>
    artifact(`/Projects/project-${index}/node_modules`, index, null),
  );
  const result = visibleArtifacts(items, "project-49", "all", "largest");
  assert.equal(result[0].size, 4999);
  assert.equal(result.length, 111);
});

test("tilde path searches match canonical paths beneath Projects/PER", () => {
  const home = homedir();
  const item = artifact(`${home}/Projects/PER/site-26/node_modules`, 100, null);
  const other = artifact(`${home}/Projects/RAY/app/node_modules`, 100, null);
  assert.deepEqual(visibleArtifacts([item, other], " ~/Projects/PER ", "all", "path"), [item]);
  assert.deepEqual(visibleArtifacts([item, other], `${home}/Projects/PER`, "all", "path"), [item]);
  assert.deepEqual(visibleArtifacts([item, other], "PER/site-26", "all", "path"), [item]);
});
