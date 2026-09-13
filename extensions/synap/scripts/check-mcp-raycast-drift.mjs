#!/usr/bin/env node
/**
 * Drift tripwire — every pod MCP tool is either on the Raycast allowlist
 * (generated/adapted Hub projection) or in ACKNOWLEDGED_GAPS with a reason.
 *
 * Sibling manifest missing: SKIP loudly (standalone CI has no synap-backend)
 * and exit 0. That is not a coverage pass — the banner says so. When the
 * sibling IS present, undeclared tools fail the build.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CATALOG_PATH = resolve(__dirname, "mcp-raycast-catalog.json");
const PKG_PATH = resolve(ROOT, "package.json");
const MANIFEST_PATH = resolve(
  ROOT,
  "../synap-backend/packages/api/src/routers/mcp/tools/mcp-tools.manifest.json",
);
const CLIENT_PATH = resolve(
  ROOT,
  "../synap-backend/packages/hub-rest-client/src/client.ts",
);

function fail(msg) {
  console.error(`mcp-raycast-drift FAIL:\n${msg}`);
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8"));
const toolNames = new Set((pkg.tools ?? []).map((t) => t.name));
const commandNames = new Set((pkg.commands ?? []).map((c) => c.name));

const allowNames = new Set(catalog.allowlist.map((e) => e.name));
const extraNames = new Set(catalog.extras);
const allowPod = new Set(catalog.allowlist.map((e) => e.podToolName));
const gapPod = new Set(Object.keys(catalog.gaps));

for (const e of catalog.allowlist) {
  if (!toolNames.has(e.name)) {
    fail(`allowlisted tool "${e.name}" (${e.podToolName}) missing from package.json tools[]`);
  }
  const src = resolve(ROOT, "src/tools", `${e.name}.ts`);
  if (!existsSync(src)) {
    fail(`allowlisted tool "${e.name}" has no src/tools/${e.name}.ts`);
  }
}
for (const name of catalog.extras) {
  if (!toolNames.has(name)) {
    fail(`Raycast extra "${name}" missing from package.json tools[]`);
  }
}

const undeclaredPkg = [...toolNames].filter((n) => !allowNames.has(n) && !extraNames.has(n));
if (undeclaredPkg.length) {
  fail(`package.json tools[] not in allowlist or extras:\n  ${undeclaredPkg.join("\n  ")}`);
}

const overlap = catalog.allowlist.filter((e) => extraNames.has(e.name));
if (overlap.length) {
  fail(`tools in BOTH allowlist and extras: ${overlap.map((e) => e.name).join(", ")}`);
}

if (!existsSync(MANIFEST_PATH)) {
  console.warn(
    "mcp-raycast-drift SKIP: sibling MCP manifest not found at\n" +
      `  ${MANIFEST_PATH}\n` +
      "This is NOT a coverage pass. Run from the monorepo checkout (synap-backend sibling)\n" +
      "or add a sibling checkout in CI. Allowlist/package.json local checks already ran.",
  );
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const mcpNames = (manifest.tools ?? []).map((t) => t.name);
if (mcpNames.length < 30) {
  fail(`manifest parsed only ${mcpNames.length} tools — detector is broken`);
}

const undeclaredMcp = mcpNames.filter((n) => !allowPod.has(n) && !gapPod.has(n));
if (undeclaredMcp.length) {
  fail(
    `MCP tools neither allowlisted nor gapped (add to allowlist or scripts/mcp-raycast-catalog.json gaps):\n  ${undeclaredMcp.join("\n  ")}`,
  );
}

const staleGaps = [...gapPod].filter((n) => !mcpNames.includes(n) || allowPod.has(n));
if (staleGaps.length) {
  fail(`ACKNOWLEDGED_GAPS stale (tool missing from manifest or now allowlisted):\n  ${staleGaps.join("\n  ")}`);
}

if (existsSync(CLIENT_PATH)) {
  const clientSrc = readFileSync(CLIENT_PATH, "utf8");
  const missingMethods = catalog.allowlist.filter((e) => {
    const re = new RegExp(`async ${e.hubMethod}\\s*\\(`);
    return !re.test(clientSrc);
  });
  if (missingMethods.length) {
    fail(
      `allowlisted tools whose HubRestClient method is missing (add the method, do not raw-fetch):\n  ${missingMethods
        .map((e) => `${e.name} → ${e.hubMethod}`)
        .join("\n  ")}`,
    );
  }
}

const commandTouched = [...commandNames].length;
if (commandTouched < 5) {
  fail("package.json commands[] collapsed — generator must never touch commands");
}

console.log(
  `mcp-raycast-drift OK: ${mcpNames.length} MCP tools, ${catalog.allowlist.length} allowlisted, ${catalog.extras.length} extras, ${gapPod.size} gapped.`,
);
