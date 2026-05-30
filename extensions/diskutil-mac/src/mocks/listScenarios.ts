/**
 * CLI: print the numbered scenario table. Used by `npm run mock:ls`.
 *
 * Run directly:  npx ts-node src/mocks/listScenarios.ts
 */
import { SCENARIO_LIST, SCENARIOS } from "./scenarios";

const header = `  #  name                          disks  notes`;
console.log(header);
console.log("─".repeat(header.length));

SCENARIO_LIST.forEach((name, idx) => {
  const s = SCENARIOS[name];
  const num = String(idx + 1).padStart(3);
  const nameCol = name.padEnd(29);
  const diskCol = (s.diskCount?.toString() ?? "-").padStart(5);
  const stall = s.latency?.stall?.weight ?? 0;
  const errs = s.errorFraction ?? 0;
  const notes = [
    s.pool ? `pool=${s.pool}` : null,
    stall > 0 ? `stalls (${stall}w)` : null,
    errs > 0 ? `errors=${(errs * 100).toFixed(0)}%` : null,
    s.listLatency && s.listLatency.minMs > 1000 ? "slow list" : null,
  ]
    .filter(Boolean)
    .join(", ");
  console.log(`${num}  ${nameCol} ${diskCol}  ${notes}`);
});

console.log("");
console.log("Run by number:  npm run dev:mock <n>          e.g. npm run dev:mock 4");
console.log("Run by name:    npm run dev:mock <name>       e.g. npm run dev:mock hdd_heavy");
console.log("Set only:       npm run mock <n|name|off>     (does not launch ray develop)");
