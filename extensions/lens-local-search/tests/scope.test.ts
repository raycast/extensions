import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, statSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readScope, restoreScope, filterScope, manifestPath } from "../src/scope.ts";
import { configurationFromPreferences, type Hit } from "../src/backend.ts";

test("review/restore and cached filtering retain edits; native report changes invalidate the cache", (t) => {
  const root = mkdtempSync(join(tmpdir(), "lens-review-")); t.after(() => rmSync(root, { recursive: true, force: true }));
  const config = configurationFromPreferences({ codeRoots: [root] }, root, root); mkdirSync(config.index);
  const path = join(root, "actual.py"); writeFileSync(path, "same"); const stat = statSync(path);
  const hit: Hit = {path,kind:"code",segment:"name",segment_id:0,size:stat.size,modified:stat.mtimeMs/1000,info:{}};
  writeFileSync(join(config.index,"scope-report.json"),JSON.stringify({version:1,updated:"",restored:[],groups:[{root,reason:"same bytes",files:[{path,size:hit.size,modified:hit.modified}]}]}));
  const result = {hits:[hit],strong:1,meaning:false};
  assert.equal(filterScope(config,result).hits.length,0);
  assert.equal(filterScope(config,result).hits.length,0);
  restoreScope(config,root,true); assert.deepEqual(JSON.parse(readFileSync(manifestPath(config),"utf8")),[]);
  assert.equal(filterScope(config,result).hits.length,1);
  restoreScope(config,root,false); assert.equal(filterScope(config,result).hits.length,0);
  writeFileSync(path,"edited file"); assert.equal(filterScope(config,result).hits.length,1);
  writeFileSync(join(config.index,"scope-report.json"),JSON.stringify({version:1,restored:[],groups:[{root:"relative",files:[]}]}));
  assert.throws(()=>readScope(config),/Invalid automatic/);
});
