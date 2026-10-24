import { createProxyController } from "../src/proxy-core";
import { readSnapshot } from "../src/diagnostic-snapshot";

async function main() {
  if (process.platform !== "darwin") throw new Error("Live testing requires macOS. Use npm test for offline tests.");
  const config = await readSnapshot();
  const report = await createProxyController(config).runDiagnostics();
  for (const check of report.checks) console.log(`${check.status.toUpperCase()} ${check.name}: ${check.detail}`);
  process.exitCode = report.passed ? 0 : 1;
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
