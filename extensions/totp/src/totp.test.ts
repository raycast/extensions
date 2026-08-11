import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { exportBackup, importBackup } from "./backup.ts";
import { generateCode, parseInput } from "./totp.ts";

const timestamps = [59, 1_111_111_109, 1_111_111_111, 1_234_567_890, 2_000_000_000, 20_000_000_000];
const expected = ["94287082", "07081804", "14050471", "89005924", "69279037", "65353130"];

for (const [index, timestamp] of timestamps.entries()) {
  assert.equal(
    generateCode({ secret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", digits: 8, period: 30, algorithm: "SHA1" }, new Date(timestamp * 1000)).value,
    expected[index],
  );
}

const account = parseInput("otpauth://totp/GitHub:me@example.com?secret=JBSWY3DP&issuer=GitHub&algorithm=SHA256&digits=8&period=45");
assert.deepEqual(account, {
  name: "me@example.com",
  issuer: "GitHub",
  secret: "JBSWY3DP",
  algorithm: "SHA256",
  digits: 8,
  period: 45,
});

const path = await exportBackup([{ id: "demo", ...account }], "passphrase");
try {
  assert.deepEqual(await importBackup(path, "passphrase"), [{ id: "demo", ...account }]);
  await assert.rejects(importBackup(path, "wrong-passphrase"));
} finally {
  await rm(path, { force: true });
}

console.log("TOTP checks passed");
