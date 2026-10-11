import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { claimRedaction, withUsageLock, type UsageRecord } from "../usage";

async function main() {
  const [path, fileId] = process.argv.slice(2);
  await withUsageLock(path, async () => {
    const usage = JSON.parse(await readFile(path, "utf8")) as UsageRecord;
    // Keep claims overlapping long enough to expose an unlocked read/write race.
    await delay(30);
    const claim = claimRedaction(usage, fileId, "2026-09-29", 5);
    await writeFile(path, JSON.stringify(claim.record));
    process.stdout.write(JSON.stringify({ allowed: claim.allowed }));
  });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
