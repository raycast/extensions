import { isolatedLibrary } from "./fixtures/library";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { findSaved } from "../src/helpers/duplicates";
import {
  rpc,
  handshake,
  queryAll,
  submit,
  status,
  statusText,
  discover,
  managerReceipt,
  dailyRecord,
  type Installation,
  type Submission,
} from "../src/helper";
const root = mkdtempSync(join(tmpdir(), "ME 中文 空格 "));
after(() => rmSync(root, { recursive: true, force: true }));
const host =
  process.env.ME_CORE_HOST ||
  "";
if (!host && !process.env.ME_INSTALLED_DISCOVERY) throw Error("Set ME_CORE_HOST or ME_INSTALLED_DISCOVERY; tests write only temporary libraries.");
const python = process.env.ME_TEST_PYTHON || join(dirname(host), "..", ".venv", "bin", "python");
const installed = process.env.ME_INSTALLED_DISCOVERY
  ? JSON.parse(readFileSync(process.env.ME_INSTALLED_DISCOVERY, "utf8"))
  : undefined;
// The shipped binary is tested with a fresh temporary configuration, never by rebinding its installed library.
const installation: Installation = installed
  ? { ...installed, args: ["--stdio", "--config", join(root, "config")] }
  : {
      executable: "/usr/bin/env",
      args: [python, host, "--stdio", "--config", join(root, "config")],
      protocol: 1,
      extensionId: "egbcchcdoehomdjokeohheklekcdomkj",
    };
let s: Awaited<ReturnType<typeof handshake>>, intent: Submission;
test("real source helper isolated library setup; no global binding", async () => {
  await rpc(installation, "create", {
    path: join(root, "library"),
    name: "ME isolated source test",
  });
  s = await handshake({
    installation,
    discoveryPath: join(root, "helper-install.json"),
  });
  writeFileSync(
    join(root, "helper-install.json"),
    JSON.stringify(installation),
  );
  assert.equal(
    (await discover(join(root, "helper-install.json"))).installation.executable,
    installation.executable,
  );
});
test("1000 real bookmarks paginate completely; matches title URL summary notes tag", async () => {
  const collection = randomUUID(),
    tag = randomUUID();
  const edits: any[] = [
    {
      entity: collection,
      kind: "collection",
      values: { name: "ME测试集合", position: { parent: null, order: 0 } },
      base: {},
    },
    { entity: tag, kind: "tag", values: { name: "中文标签" }, base: {} },
  ];
  for (let i = 0; i < 1000; i++)
    edits.push({
      entity: randomUUID(),
      kind: "bookmark",
      base: {},
      values: {
        title: `Page ${String(i).padStart(4, "0")}`,
        url: `https://example.org/me/${i}`,
        description: "摘要-" + i,
        note: "备注-" + i,
        position: { parent: collection, order: i },
        ["tag:" + tag]: true,
      },
    });
  await rpc(
    installation,
    "execute",
    { id: randomUUID(), libraryId: s.libraryId, edits },
    s.libraryId,
    { timeoutMs: 30000 },
  );
  const start = performance.now();
  const all = await queryAll(s);
  const queryMs = Math.round(performance.now() - start);
  assert.equal(all.total, 1000);
  assert.equal(all.items.length, 1000);
  for (const q of [
    "Page 0999",
    "example.org/me/999",
    "摘要-999",
    "备注-999",
    "中文标签",
  ])
    assert.ok((await queryAll(s, { q })).total > 0);
  assert.equal((await queryAll(s, { collection })).total, 1000);
  writeFileSync(
    join(root, "performance.json"),
    JSON.stringify(
      {
        scope: installed
          ? "installed executable, isolated temporary config"
          : "source helper, isolated temporary config",
        helperVersion: s.version,
        items: all.total,
        queryMs,
        libraryId: s.libraryId,
        root,
      },
      null,
      2,
    ),
  );
});
test("real save and idempotent retry; same payload reused; local-only status", async () => {
  intent = {
    session: s,
    command: {
      id: randomUUID(),
      libraryId: s.libraryId,
      edits: [
        {
          entity: randomUUID(),
          kind: "bookmark",
          base: {},
          values: {
            title: "ME真实核心",
            url: "https://example.org/me-raycast",
            note: "仅虚构数据",
          },
        },
      ],
    },
  };
  await submit(intent);
  await submit(intent);
  assert.equal((await queryAll(s, { q: "ME真实核心" })).total, 1);
  assert.equal(statusText(await status(s)), "Local only");
});
test("changed payload reuse rejected even after committed-readable", async () => {
  const changed = structuredClone(intent);
  changed.command.edits[0].values.note = "different";
  await assert.rejects(submit(changed), { code: "ID_COLLISION" });
});
test("a page already in the library is found instead of saved twice", async (t) => {
  const fixture = await isolatedLibrary();
  t.after(fixture.cleanup);
  const s = fixture.session, installation = s.installation;
  const saved = "https://example.org/duplicate-check?utm_source=newsletter";
  await rpc(
    installation,
    "execute",
    {
      id: randomUUID(),
      libraryId: s.libraryId,
      edits: [
        {
          entity: randomUUID(),
          kind: "bookmark",
          base: {},
          values: { title: "Duplicate check", url: saved },
        },
      ],
    },
    s.libraryId,
  );
  const found = await findSaved(s, ["https://www.example.org/duplicate-check/"]);
  assert.equal(found.length, 1);
  assert.equal(found[0].entity.values.url, saved);
  assert.equal(found[0].entity.kind, "bookmark");
  assert.deepEqual(await findSaved(s, ["https://example.org/duplicate-check-other"]), []);
  assert.deepEqual(await findSaved(s, ["https://example.org/another-page"]), []);
  // Trash is not "already saved": the page can be written again.
  const entity = (await rpc(installation, "get", { id: found[0].entity.id }, s.libraryId)) as any;
  await rpc(
    installation,
    "execute",
    {
      id: randomUUID(),
      libraryId: s.libraryId,
      edits: [{ entity: entity.id, kind: "bookmark", base: entity.heads, values: { life: "trashed" } }],
    },
    s.libraryId,
  );
  assert.deepEqual(await findSaved(s, [saved]), []);
});
test("a hit stops the whole batch: the existing row is untouched and no new row is written", async (t) => {
  const fixture = await isolatedLibrary();
  t.after(fixture.cleanup);
  const s = fixture.session, installation = s.installation;
  const link = "https://example.org/redirect-target";
  const created = (await rpc(
    installation,
    "execute",
    {
      id: randomUUID(),
      libraryId: s.libraryId,
      edits: [
        {
          entity: randomUUID(),
          kind: "bookmark",
          base: {},
          values: { url: link, title: "Curated title", note: "Curated note", position: { parent: null, order: 1 } },
        },
      ],
    },
    s.libraryId,
  )) as { writtenHeads?: Record<string, unknown> };
  const id = Object.keys(created.writtenHeads ?? {})[0];
  const heads = async () => ((await rpc(installation, "get", { id }, s.libraryId)) as any).heads;
  const stored = await heads();

  // The form looks the batch up before writing. One hit is enough: the save
  // leaves for that bookmark, so neither the existing page nor the new one gets
  // a write, and the stored row keeps exactly the version it had.
  const batch = ["https://www.example.org/redirect-target/", "https://example.org/redirect-brand-new"];
  const hits = await findSaved(s, batch);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].entity.id, id);
  assert.deepEqual(await heads(), stored);
  assert.equal((await queryAll(s, { q: "redirect-brand-new" })).total, 0);
  assert.equal((await queryAll(s, { q: "redirect-target" })).total, 1);

  // The row the user is sent to is the one they stored, values intact.
  const row = (await rpc(installation, "get", { id }, s.libraryId)) as any;
  assert.equal(row.values.title, "Curated title");
  assert.equal(row.values.note, "Curated note");

  // Only a page that is nowhere in the library still saves.
  assert.deepEqual(await findSaved(s, ["https://example.org/redirect-brand-new"]), []);
});
test("response lost after actual core commit recovers without duplication", async () => {
  const wrapper = join(root, "lost-response.cjs");
  writeFileSync(
    wrapper,
    `const {spawnSync}=require('child_process');let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>{const req=JSON.parse(s);const r=spawnSync(${JSON.stringify(installation.executable)},${JSON.stringify(installation.args)},{input:s});if(req.method==='execute')setTimeout(()=>process.stdout.write(r.stdout),2000);else process.stdout.write(r.stdout);});`,
  );
  const p = structuredClone(intent);
  p.command.id = randomUUID();
  p.command.edits[0].entity = randomUUID();
  p.session.installation = {
    ...installation,
    executable: process.execPath,
    args: [wrapper, "--stdio"],
  };
  await assert.rejects(submit(p, 1000), { code: "COMMIT_UNKNOWN" });
  p.session.installation = installation;
  await submit(p);
  assert.equal((await queryAll(s, { q: "ME真实核心" })).total, 2);
});
test("switch library prevents original frozen command being delivered to new library", async () => {
  await rpc(installation, "create", {
    path: join(root, "second"),
    name: "Other test library",
  });
  await assert.rejects(submit(intent), { code: "LIBRARY_MISMATCH" });
  await rpc(installation, "bind", { path: join(root, "library") });
});
test("missing helper and protocol mismatch are explicit", async () => {
  await assert.rejects(
    rpc(
      { ...installation, executable: "/no-such-me-helper" },
      "capabilities",
      {},
    ),
    { code: "HELPER_MISSING" },
  );
  const f = join(root, "wrong-version.cjs");
  writeFileSync(
    f,
    "let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>{const r=JSON.parse(s);console.log(JSON.stringify({v:2,id:r.id,ok:true,result:{}}))});",
  );
  await assert.rejects(
    rpc(
      { ...installation, executable: process.execPath, args: [f] },
      "capabilities",
      {},
    ),
    { code: "VERSION" },
  );
});
test("real field conflict retains candidates; trash excluded", async () => {
  const b = (await queryAll(s, { q: "ME真实核心" })).items[0];
  for (const title of ["first-conflict", "second-conflict"])
    await rpc(
      installation,
      "execute",
      {
        id: randomUUID(),
        libraryId: s.libraryId,
        edits: [
          { entity: b.id, kind: "bookmark", base: b.heads, values: { title } },
        ],
      },
      s.libraryId,
    );
  const r = await queryAll(s, { q: "second-conflict" });
  assert.equal(r.total, 1);
  assert.equal(r.items[0].conflicts.title.length, 2);
  const item = (await queryAll(s, { q: "Page 0999" })).items[0];
  await rpc(
    installation,
    "execute",
    {
      id: randomUUID(),
      libraryId: s.libraryId,
      edits: [
        { entity: item.id, base: item.heads, values: { life: "trashed" } },
      ],
    },
    s.libraryId,
  );
  assert.equal((await queryAll(s, { q: "Page 0999" })).total, 0);
});

test("configured empty library is not reported synced before a real success", async () => {
  const base = await status(s);
  assert.equal(
    statusText({
      ...base,
      configured: true,
      pending: 0,
      conflicts: 0,
      sync: {},
    }),
    "Not yet synced",
  );
  assert.equal(
    statusText({
      ...base,
      configured: true,
      pending: 0,
      conflicts: 0,
      sync: { lastSuccess: 1 },
    }),
    "Synced",
  );
});
test("actual config permission error retains the formal PERMISSION error", async () => {
  const dir = join(root, "config");
  chmodSync(dir, 0);
  try {
    await assert.rejects(rpc(installation, "capabilities", {}), {
      code: "PERMISSION",
    });
  } finally {
    chmodSync(dir, 0o700);
  }
});
test("real concurrent insertion restarts pagination without missing rows", async () => {
  const wrapper = join(root, "concurrent-page.cjs"),
    flag = join(root, "inserted.flag");
  const command = {
    v: 1,
    id: randomUUID(),
    libraryId: s.libraryId,
    method: "execute",
    params: {
      id: randomUUID(),
      libraryId: s.libraryId,
      edits: [
        {
          entity: randomUUID(),
          kind: "bookmark",
          base: {},
          values: {
            title: "Page concurrent new",
            url: "https://example.org/new",
          },
        },
      ],
    },
  };
  writeFileSync(
    wrapper,
    `const fs=require('fs'),{spawnSync}=require('child_process');let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{const q=JSON.parse(input);if(q.method==='query'&&q.params.offset>0&&!fs.existsSync(${JSON.stringify(flag)})){fs.writeFileSync(${JSON.stringify(flag)},'1');const w=spawnSync(${JSON.stringify(installation.executable)},${JSON.stringify(installation.args)},{input:${JSON.stringify(JSON.stringify(command) + "\n")}});if(!JSON.parse(w.stdout).ok)throw Error('insert failed');}const r=spawnSync(${JSON.stringify(installation.executable)},${JSON.stringify(installation.args)},{input,maxBuffer:2000000});process.stdout.write(r.stdout);});`,
  );
  const wrapped = {
    ...s,
    installation: {
      ...installation,
      executable: process.execPath,
      args: [wrapper, "--stdio"],
    },
  };
  const result = await queryAll(wrapped, { q: "Page" });
  assert.equal(result.total, 1000);
  assert.equal(result.items.length, 1000);
  assert.equal(new Set(result.items.map((x) => x.id)).size, 1000);
  assert.ok(result.items.some((x) => x.values.title === "Page concurrent new"));
});
test("oversized real result pages shrink without truncating notes", async () => {
  for (let i = 0; i < 12; i++)
    await rpc(
      installation,
      "execute",
      {
        id: randomUUID(),
        libraryId: s.libraryId,
        edits: [
          {
            entity: randomUUID(),
            kind: "bookmark",
            base: {},
            values: {
              title: "Large note " + i,
              url: "https://example.org/large/" + i,
              note: "a".repeat(90000),
            },
          },
        ],
      },
      s.libraryId,
    );
  const result = await queryAll(s, { q: "Large note" });
  assert.equal(result.total, 12);
  assert.equal(result.items.length, 12);
  for (const b of result.items)
    assert.equal((b.values.note as string).length, 90000);
});

test("discovery prefers the installed record over a retired 0.2 record", async () => {
  const dir = join(root, "discovery");
  mkdirSync(dir);
  const record = (executable: string) =>
    JSON.stringify({
      name: "ME",
      protocol: 1,
      executable,
      args: ["--stdio", "--config", dir],
      extensionId: "egbcchcdoehomdjokeohheklekcdomkj",
    });
  const retired = join(dir, "retired.json"),
    daily = join(dir, "daily.json"),
    other = join(dir, "other.json"),
    gone = join(dir, "gone.json");
  writeFileSync(
    retired,
    record(
      "/Users/x/Library/Application Support/me-mark-everything/runtime/me-mark-everything-host",
    ),
  );
  writeFileSync(
    daily,
    record(
      "/Users/x/Library/Application Support/me-raindrop/runtime/me-raindrop-host",
    ),
  );
  writeFileSync(other, record("/opt/me/helper"));
  const fallback = await discover(retired, daily);
  assert.equal(fallback.discoveryPath, daily);
  assert.match(fallback.notice!, /retired/);
  assert.equal((await discover(other, daily)).discoveryPath, other);
  await assert.rejects(discover(gone, daily), { code: "HELPER_MISSING" });
  await assert.rejects(discover(retired, join(dir, "absent.json")), {
    code: "HELPER_MISSING",
  });
  assert.match(dailyRecord(), /me-raindrop[/\\]helper-install\.json$/);
});
test("manager receipt accepts the installed manager's routes only", () => {
  const base = { requestId: "r", libraryId: "L", opened: true };
  assert.equal(
    managerReceipt({ ...base, fragment: "/my/0/item/12345" }, "L", true).opened,
    true,
  );
  assert.equal(managerReceipt({ ...base, fragment: "/my/0" }, "L", false).opened, true);
  for (const [value, item] of [
    [{ ...base, fragment: "item=63232a6b-81c8-4282-9a03-1af77244435c" }, true],
    [{ ...base, fragment: "conflicts" }, false],
    [{ ...base, fragment: "/my/0/item/1" }, false],
    [{ ...base, fragment: "/my/0" }, true],
    [{ ...base, libraryId: "other", fragment: "/my/0" }, false],
    [{ ...base, fragment: "/my/0", opened: undefined }, false],
  ] as const)
    assert.throws(() => managerReceipt(value, "L", item as boolean), {
      code: "INVALID_RESPONSE",
    });
});
