/** Runs the same durable creation path as the form against a fresh isolated library. */
import assert from "node:assert/strict";
import { queryAll } from "../src/helper";
import { prepareNewBookmarks } from "../src/helpers/save";
import { SubmissionController } from "../src/helpers/submission";
import { isolatedLibrary, memoryStore } from "../tests/fixtures/library";
async function main() {
  const fixture = await isolatedLibrary();
  try {
    const controller = new SubmissionController(memoryStore());
    const create = (url: string) => controller.start("create", () => prepareNewBookmarks({ entries: [{ url }], tags: [] }, fixture.session));
    assert.equal((await create("https://example.org/a,b;c")).kind, "committed");
    const before = await queryAll(fixture.session);
    assert.equal((await create("http://www.example.org/a,b;c/")).kind, "rejected");
    assert.equal((await queryAll(fixture.session)).revision, before.revision);
    console.log(JSON.stringify({ scope: "isolated temporary library", duplicateRejected: true, completeURL: before.items[0].values.url }));
  } finally { fixture.cleanup(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
