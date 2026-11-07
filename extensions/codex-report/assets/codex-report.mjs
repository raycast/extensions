#!/usr/bin/env node
import { parseArgs, usage } from "./lib/cli.js";
import { buildReport } from "./lib/report.js";
import { renderReport, renderPlainSections } from "./lib/render.js";
import { jsonReport } from "./lib/json.js";
import { clearSessionCaches } from "./lib/cache.js";
import { agentAdapters } from "./lib/adapters/index.js";
import { fmtInt } from "./lib/format.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); return; }
  agentAdapters(args.agent); // Validate selection even for --clear-cache.
  if (args.clearCache) {
    const removed = await clearSessionCaches(agentAdapters("all"));
    const message = `Cleared ${fmtInt(removed)} Codex Report cache ${removed === 1 ? "file" : "files"}.`;
    console.log(args.json ? JSON.stringify({ clearedCacheFiles: removed }) : message);
    return;
  }
  const report = await buildReport(args);
  if (args.json) { console.log(JSON.stringify(jsonReport(report))); return; }
  console.log(args.sections.length > 0 ? renderPlainSections(report) : renderReport(report));
}

main().catch((error) => {
  console.error(error.message);
  usage();
  process.exitCode = 1;
});
