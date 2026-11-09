import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { findSaved } from "../src/helpers/duplicates";
import type { Session } from "../src/helper";
const root = mkdtempSync("/private/tmp/me-duplicates-");
after(() => rmSync(root, { force: true, recursive: true }));
function fixture(body: string): Session {
  const path = join(root, `${Math.random()}.cjs`);
  writeFileSync(
    path,
    `let input=''; process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{const req=JSON.parse(input),{offset,limit}=req.params;const entity=(i)=>({id:String(i),kind:'bookmark',values:{url:'https://example.org/'+i,life:'active'},heads:{},conflicts:{},policies:{},structural:[],purged:false,tags:[],candidateMatch:false}); const result=(()=>{${body}})();console.log(JSON.stringify({v:1,id:req.id,ok:true,result}));});`,
  );
  return {
    libraryId: "L",
    installation: { executable: process.execPath, args: [path], protocol: 1, extensionId: "a".repeat(32) },
  } as Session;
}
test("1000-candidate limit is unconfirmed, never no-match", async () => {
  const s = fixture(
    "return {items:Array.from({length:limit},(_,i)=>entity(offset+i)),total:1001,revision:'r'};",
  );
  await assert.rejects(findSaved(s, ["https://example.org/target"]), { code: "DUPLICATES_UNCONFIRMED" });
});
test("revision changes and short incomplete scans cannot authorize writes", async () => {
  for (const body of [
    "return {items:[entity(offset)],total:2,revision:String(offset)};",
    "return {items:[],total:2,revision:'r'};",
  ])
    await assert.rejects(findSaved(fixture(body), ["https://example.org/target"]), {
      code: "DUPLICATES_UNCONFIRMED",
    });
});
test("excluding self still scans and finds a different matching entity", async () => {
  const s = fixture(
    "return {items:[{...entity(1),values:{url:'https://example.org/target',life:'active'}},{...entity(2),values:{url:'https://example.org/target',life:'active'}}],total:2,revision:'r'};",
  );
  const hits = await findSaved(s, ["https://example.org/target"], undefined, "1");
  assert.deepEqual(
    hits.map((h) => h.entity.id),
    ["2"],
  );
});
