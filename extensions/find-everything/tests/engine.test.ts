import { afterAll, expect, test } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const home = realpathSync(mkdtempSync(join(tmpdir(), "find-everything-test-")));
const engine = resolve("src/engine.ts");
const cli = resolve("src/cli.ts");
afterAll(() => rmSync(home, { recursive: true, force: true }));

function run(code: string) {
  const result = spawnSync(
    process.execPath,
    ["--eval", `import * as e from ${JSON.stringify(engine)}; ${code}`],
    {
      env: { ...process.env, HOME: home },
      encoding: "utf8",
      timeout: 15000,
    },
  );
  if (result.status !== 0)
    throw new Error(result.stderr || `exit ${result.status}`);
  return JSON.parse(result.stdout.trim());
}

function search(query: string, paths: string[]) {
  return run(`const fs = await import('node:fs');
    fs.mkdirSync(e.INDEX_DIR, {recursive:true});
    fs.rmSync(e.shardDirFor('custom'), {recursive:true,force:true});
    fs.writeFileSync(e.indexPathFor('custom'), ${JSON.stringify(paths.join("\n") + "\n")});
    console.log(JSON.stringify(await e.runSearch(${JSON.stringify(query)}, 'custom', 300)));`);
}

test("fuzzy terms retain subsequence matches", () => {
  expect(search("rprt", ["/docs/report.pdf", "/docs/unrelated.txt"])).toEqual([
    "/docs/report.pdf",
  ]);
});

test("all terms are applied before limiting candidates", () => {
  const paths = Array.from(
    { length: 32001 },
    (_, i) => `/Users/other-${i}.txt`,
  );
  paths.push("/Users/invoice.pdf");
  expect(search("Users invoice", paths)).toContain("/Users/invoice.pdf");
});

test("absolute and home folder constraints exclude sibling directories", () => {
  for (const folder of ["/code", "~/code"]) {
    const base = folder.replace("~", home);
    expect(
      search(`in:${folder}`, [
        `${base}/report.pdf`,
        `${base}-backup/report.pdf`,
        `/other${base}/report.pdf`,
      ]),
    ).toEqual([`${base}/report.pdf`]);
  }
});

test("quoted pipes and spaces are literal while unquoted pipes alternate", () => {
  const paths = [
    "/docs/a|b.txt",
    "/docs/a.txt",
    "/docs/b.txt",
    "/docs/release notes.txt",
    "/docs/release-other-notes.txt",
  ];
  expect(search('"a|b"', paths)).toEqual(["/docs/a|b.txt"]);
  expect(search('"release notes"', paths)).toEqual(["/docs/release notes.txt"]);
  expect(search("a|b", paths)).toContain("/docs/a.txt");
  expect(search("a|b", paths)).toContain("/docs/b.txt");
});

test("sharding preserves complete paths and clears empty generations", () => {
  expect(
    run(`const fs = await import('node:fs');
    const file = e.indexPathFor('custom'), dir = e.shardDirFor('custom');
    const text = Array.from({length:37},(_,i)=>'/docs/'+i+'x'.repeat(i+30)).join('\\n')+'\\n';
    fs.writeFileSync(file,text);
    await Promise.all([e.shardIndex(file,dir),e.shardIndex(file,dir)]);
    const lines=fs.readdirSync(dir).filter(p=>p.startsWith('s-')).flatMap(p=>fs.readFileSync(dir+'/'+p,'utf8').split('\\n').filter(Boolean)).sort();
    const intact=JSON.stringify(lines)===JSON.stringify(text.trim().split('\\n').sort());
    fs.writeFileSync(file,''); await e.shardIndex(file,dir);
    console.log(JSON.stringify({intact,empty:(await e.runSearch('docs','custom',300)).length===0}));`),
  ).toEqual({ intact: true, empty: true });
});

test("first index build creates its directory and changed settings invalidate it", () => {
  const a = join(home, "first"),
    b = join(home, "second");
  mkdirSync(a, { recursive: true });
  mkdirSync(b, { recursive: true });
  writeFileSync(join(a, "first.txt"), "one");
  writeFileSync(join(b, "second.txt"), "two");
  expect(
    run(`const fs = await import('node:fs'); fs.rmSync(e.INDEX_DIR,{recursive:true,force:true});
    await e.rebuildIndex('custom',{customSearchPaths:${JSON.stringify(a)}});
    await e.ensureIndex('custom',{customSearchPaths:${JSON.stringify(b)}});
    console.log(JSON.stringify(fs.readFileSync(e.indexPathFor('custom'),'utf8')));`),
  ).toContain("second.txt");
});

test("foreground search refreshes an expired index", () => {
  const dir = join(home, "freshness");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "before.txt"), "before");
  expect(
    run(`const fs = await import('node:fs'); const opts={customSearchPaths:${JSON.stringify(dir)}};
    await e.ensureIndex('custom',opts,true);
    fs.writeFileSync(${JSON.stringify(join(dir, "after.txt"))},'after');
    fs.utimesSync(e.indexPathFor('custom'),new Date(0),new Date(0));
    await e.ensureIndex('custom',opts,false,false);
    console.log(JSON.stringify(await e.runSearch('after','custom',300)));`),
  ).toContain(join(dir, "after.txt"));
});

test("preview prints text content", () => {
  const file = join(home, "preview.txt");
  writeFileSync(file, "preview content marker");
  const result = spawnSync(process.execPath, [cli, "preview", file], {
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("preview content marker");
});

test("cancelled searches stop their pipeline and return no results", () => {
  expect(
    run(`const controller=new AbortController();
    const promise=e.runSearch('before','custom',300,undefined,controller.signal);
    controller.abort(); console.log(JSON.stringify(await promise));`),
  ).toEqual([]);
});

test("an index destination failure rejects without replacing the old index", () => {
  expect(
    run(`const fs=await import('node:fs');
    const file=e.indexPathFor('custom'); fs.rmSync(file,{force:true}); fs.mkdirSync(file);
    let rejected=false; try { await e.rebuildIndex('custom',{}); } catch { rejected=true; }
    const preserved=fs.statSync(file).isDirectory(); fs.rmSync(file,{recursive:true});
    console.log(JSON.stringify({rejected,preserved}));`),
  ).toEqual({ rejected: true, preserved: true });
});

test("failed shard publication falls back to the current flat index", () => {
  expect(
    run(`const fs=await import('node:fs'); const file=e.indexPathFor('custom'),dir=e.shardDirFor('custom');
    fs.rmSync(dir,{recursive:true,force:true}); fs.writeFileSync(file,'/docs/old.txt\\n');
    await e.shardIndex(file,dir); fs.writeFileSync(file,'/docs/new.txt\\n');
    console.log(JSON.stringify(await e.runSearch('new','custom',300)));`),
  ).toEqual(["/docs/new.txt"]);
});

test("binary discovery resolves custom PATH executables", () => {
  const bin = join(home, "custom-bin");
  mkdirSync(bin, { recursive: true });
  const tool = join(bin, "fe-test-tool");
  writeFileSync(tool, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  expect(
    run(
      `process.env.PATH=${JSON.stringify(bin)}; console.log(JSON.stringify(e.findBin('fe-test-tool')));`,
    ),
  ).toEqual(tool);
});
