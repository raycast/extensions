import { ENCYCLOPEDIA_PROVIDERS } from "../src/providers/encyclopedias";

async function main() {
  let failures = 0;
  for (const provider of ENCYCLOPEDIA_PROVIDERS) {
    try {
      const results = await provider.search("identity", { signal: AbortSignal.timeout(20_000) });
      if (!results.length) { console.log(`FAIL ${provider.name}: no results`); failures += 1; }
      else console.log(`PASS ${provider.name}: ${results.length} result(s)`);
    } catch (error) {
      console.log(`FAIL ${provider.name}: ${error instanceof Error ? error.message : String(error)}`);
      failures += 1;
    }
  }
  if (failures) process.exitCode = 1;
}

void main();
