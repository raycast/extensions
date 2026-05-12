import { EXAMPLES, parseAndResolve } from "../src/time-core";

const failures: string[] = [];

for (const query of EXAMPLES) {
  const { parsed, results } = parseAndResolve(query, { localZone: "Europe/Lisbon", hourFormat: "24" });
  if (parsed.mode === "unknown" || results.length === 0) {
    failures.push(`${query} -> ${parsed.mode}, ${results.length} results`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Smoke tested ${EXAMPLES.length} natural timezone queries.`);
