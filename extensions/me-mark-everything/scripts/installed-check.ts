/** Installed binary only; no caller-provided library is ever used for writes. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { queryAll, submit } from "../src/helper";
import { prepareSave } from "../src/helpers/save";
import { isolatedLibrary } from "../tests/fixtures/library";
async function main() {
  if (!process.env.ME_INSTALLED_DISCOVERY) throw Error("Set ME_INSTALLED_DISCOVERY to select the installed executable. A fresh temporary config/library will be created.");
  const fixture = await isolatedLibrary();
  try {
    const pending = prepareSave({ entries: [{ url: "https://example.org/isolated-idempotency", title: "Isolated replay" }], tags: [] }, randomUUID(), fixture.session);
    await submit(pending); await submit(pending);
    assert.equal((await queryAll(fixture.session)).total, 1);
    console.log(JSON.stringify({ scope: "installed helper, temporary config and library", version: fixture.session.version, replayCreatesOnce: true }));
  } finally { fixture.cleanup(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
