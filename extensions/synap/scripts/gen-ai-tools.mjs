#!/usr/bin/env node
/**
 * Sync Raycast package.json tool descriptions from the pod MCP manifest.
 * Adapter/thin implementations stay in src/tools/*.ts — this does not invent
 * a second catalog. Re-run after `pnpm --filter @synap/api gen:mcp-manifest`.
 *
 * Never touches commands[].
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CATALOG = JSON.parse(readFileSync(resolve(__dirname, "mcp-raycast-catalog.json"), "utf8"));
const PKG_PATH = resolve(ROOT, "package.json");
const MANIFEST_PATH = resolve(
  ROOT,
  "../synap-backend/packages/api/src/routers/mcp/tools/mcp-tools.manifest.json",
);

if (!existsSync(MANIFEST_PATH)) {
  console.error(`Pod MCP manifest not found: ${MANIFEST_PATH}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const byPod = new Map((manifest.tools ?? []).map((t) => [t.name, t]));
const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8"));
const commandsBefore = JSON.stringify(pkg.commands);

const nameMap = new Map([
  ...CATALOG.allowlist.map((e) => [e.podToolName, e.name]),
  // Gapped MCP names that still appear in allowlisted descriptions → extras
  ["synap_list_capabilities", "list-capabilities"],
  ["synap_list_views", "list-views"],
  ["synap_list_widgets", "list-widgets"],
  ["synap_create_view", "create-view"],
  ["synap_get_relations", "get-connections"],
  ["synap_get_entities", "ask"],
  ["synap_get_graph", "get-connections"],
]);
function rewrite(text) {
  let out = text;
  const names = [...nameMap.keys()].sort((a, b) => b.length - a.length);
  for (const podName of names) {
    out = out.replace(new RegExp(`\\b${podName}\\b`, "g"), nameMap.get(podName));
  }
  return out;
}

/** Full replacement for tools whose MCP dump exceeds Raycast's 2048-char tool description cap. */
const DESCRIPTION_OVERRIDE = {
  capture:
    "THE write door. Send `text` and/or JSON-string `entities`/`relations` — do not classify first. ask first to avoid duplicates. " +
    "Strong identity keys (exact spellings): email, phone, website, linkedinUrl, twitterHandle, githubUsername. " +
    "`proposed` is SUCCESS — surface reviewUrl as a markdown link; never retry. " +
    "`rejected` with already-known or no-durable-content is correct (do not retry). " +
    "Raycast adapter: no `global` (use `synap capture --global`); no forceCreate; no capture-commit. " +
    "If structuring is degraded, NOTHING is written; retry shortly. Placement uses existing lenses only; never invent a workspace.",
};

const ADAPTER_NOTES = {
  "create-entity":
    "Raycast adapter: no forceCreate (reuse or capture). Creation-time facets must go through capture. Roles use attach-role.",
  "run-action":
    "Raycast adapter: discover runnable verbs with list-actions, then run-action. list-capabilities is the pack catalog (install/connect/enable), not the execute list. JSON `parameters` string.",
  "create-relation":
    "Raycast adapter: check get-connections before linking to avoid duplicates.",
  "attach-role":
    "Raycast adapter: find the entity with ask (or get-entity), then attach-role. Roles are facets, never new entities.",
  "start-session":
    "Raycast adapter: declare only. Does not run the desk. Lead with the /open link. Need workspaceId or projectId (or an explicit Set Synap Focus). REST has no subjectEntityId — do not send one.",
};

const toolsByName = new Map((pkg.tools ?? []).map((t) => [t.name, t]));
for (const entry of CATALOG.allowlist) {
  const pod = byPod.get(entry.podToolName);
  if (!pod) {
    console.error(`Allowlisted ${entry.podToolName} missing from MCP manifest`);
    process.exit(1);
  }
  const existing = toolsByName.get(entry.name);
  if (!existing) {
    console.error(`Allowlisted ${entry.name} missing from package.json tools[]`);
    process.exit(1);
  }
  let description = DESCRIPTION_OVERRIDE[entry.name] ?? rewrite(pod.description);
  if (!DESCRIPTION_OVERRIDE[entry.name] && entry.name === "run-action") {
    description = description.replace(/\bdiscover via list-capabilities\b/g, "discover via list-actions");
  }
  const note = !DESCRIPTION_OVERRIDE[entry.name] && ADAPTER_NOTES[entry.name];
  if (note) {
    description = `${description}\n\n${note}`;
  }
  if (description.length > 2048) {
    console.error(`gen-ai-tools: ${entry.name} description is ${description.length} chars (Raycast max 2048)`);
    process.exit(1);
  }
  existing.description = description;
  if (pod.annotations?.title && !existing.title) {
    existing.title = pod.annotations.title;
  }
}

if (JSON.stringify(pkg.commands) !== commandsBefore) {
  console.error("gen-ai-tools refused: commands[] would change");
  process.exit(1);
}

writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");
console.log(`gen-ai-tools: synced ${CATALOG.allowlist.length} tool descriptions from MCP manifest.`);
