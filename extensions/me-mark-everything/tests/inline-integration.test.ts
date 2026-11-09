import assert from "node:assert/strict";
import test, { after } from "node:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
  renameSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  commandState,
  getBookmark,
  handshake,
  rpc,
  submit,
  type Entity,
  type Installation,
  type Session,
} from "../src/helper";
import { editBaseline, prepareEdit, preflightEdit, tagChoices } from "../src/helpers/edit";
import { findSaved } from "../src/helpers/duplicates";
import { SubmissionController, type Store } from "../src/helpers/submission";
import { prepareSave } from "../src/helpers/save";
const root = mkdtempSync("/private/tmp/me-inline-integration-");
const host =
  process.env.ME_CORE_HOST ??
  "";
if (!host && !process.env.ME_INSTALLED_DISCOVERY) throw Error("Set ME_CORE_HOST or ME_INSTALLED_DISCOVERY; tests write only temporary libraries.");
const python = process.env.ME_TEST_PYTHON || join(dirname(host), "..", ".venv", "bin", "python");
const installed = process.env.ME_INSTALLED_DISCOVERY
  ? JSON.parse(readFileSync(process.env.ME_INSTALLED_DISCOVERY, "utf8"))
  : undefined;
const installation: Installation = installed
  ? { ...installed, args: ["--stdio", "--config", join(root, "config")], libraryId: undefined }
  : {
      executable: "/usr/bin/env",
      args: [python, host, "--stdio", "--config", join(root, "config")],
      protocol: 1,
      extensionId: "a".repeat(32),
    };
let s: Session;
after(() => rmSync(root, { recursive: true, force: true }));
const write = async (edits: any[]) =>
  rpc(installation, "execute", { id: randomUUID(), libraryId: s.libraryId, edits }, s.libraryId);
async function bookmark() {
  const id = randomUUID();
  await write([
    {
      entity: id,
      kind: "bookmark",
      values: {
        url: "https://example.org/" + id,
        title: "Title",
        note: "Note",
        description: "Auto",
        position: { parent: null, order: 9 },
      },
      autoFields: ["title", "description"],
      base: {},
    },
  ]);
  return getBookmark(s, id);
}
function edit(e: Entity, values: any) {
  const base = editBaseline(e);
  return prepareEdit(e, base, { ...base, ...values }, randomUUID(), s, {})!;
}
function memoryStore(): Store {
  let raw: string | undefined;
  return {
    getItem: async () => raw,
    setItem: async (_, value) => {
      raw = value;
    },
    removeItem: async () => {
      raw = undefined;
    },
  };
}
function wrapper(name: string, body: string): Session {
  const file = join(root, name + ".cjs");
  writeFileSync(
    file,
    `const {spawnSync}=require('node:child_process');let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{const req=JSON.parse(input);const call=()=>spawnSync(${JSON.stringify(installation.executable)},${JSON.stringify(installation.args)},{input,maxBuffer:2000000});${body}});`,
  );
  return { ...s, installation: { ...installation, executable: process.execPath, args: [file, "--stdio"] } };
}
test("inline integration uses a fresh config and temporary library", async () => {
  await rpc(installation, "create", { path: join(root, "library"), name: "Inline edit verification" });
  s = await handshake({ installation, discoveryPath: join(root, "record.json") });
});
test("all daily fields preserve order and metadata policy of untouched fields", async () => {
  const e = await bookmark(),
    tag = randomUUID(),
    collection = randomUUID();
  await write([
    { entity: tag, kind: "tag", base: {}, values: { name: "Existing tag" } },
    {
      entity: collection,
      kind: "collection",
      base: {},
      values: { name: "Existing collection", position: { parent: null, order: 1 } },
    },
  ]);
  const tags = [(await rpc(installation, "get", { id: tag }, s.libraryId)) as Entity];
  const baseline = editBaseline(e),
    url = "https://example.org/中文/a,b;c";
  const p = prepareEdit(
    e,
    baseline,
    {
      ...baseline,
      title: "",
      link: url,
      note: "\n note ",
      description: "Manual",
      favorite: true,
      collection,
      tags: [tag],
    },
    randomUUID(),
    s,
    { tags: tagChoices(tags, []), collections: [collection] },
  )!;
  await preflightEdit(p);
  assert.equal(
    (await new SubmissionController(memoryStore()).start("edit", async () => p)).kind,
    "committed",
  );
  const saved = await getBookmark(s, e.id);
  assert.equal(saved.values.url, url);
  assert.equal(saved.values.title, "");
  assert.equal(saved.values.note, "\n note ");
  assert.equal(saved.values.favorite, true);
  assert.deepEqual(saved.values.position, { parent: collection, order: 9 });
  assert.equal(saved.values["tag:" + tag], true);
  assert.equal(saved.policies.title, "manual");
  assert.equal(saved.policies.description, "manual");
  assert.deepEqual(await findSaved(s, [url], undefined, e.id), []);
  assert.equal((await findSaved(s, [url])).length, 1);
  const other = await bookmark(),
    noteOnly = edit(other, { note: "changed" });
  await preflightEdit(noteOnly);
  await submit(noteOnly);
  const after = await getBookmark(s, other.id);
  assert.deepEqual(after.heads.title, other.heads.title);
  assert.equal(after.policies.title, "auto");
  assert.equal(after.policies.description, "auto");
});
test("preflight compares only dirty fields and never replaces baseline heads", async () => {
  const e = await bookmark(),
    p = edit(e, { title: "mine" });
  await submit(edit(e, { note: "other" }));
  await preflightEdit(p);
  assert.deepEqual(p.command.edits[0].base, e.heads);
  const current = await getBookmark(s, e.id);
  await submit(edit(current, { title: "theirs" }));
  await assert.rejects(preflightEdit(p), { code: "STALE_EDIT" });
  assert.equal((await commandState(p)).state, "not-found");
});
test("race after preflight reports saved conflict, including an originally missing field", async () => {
  const e = await bookmark();
  delete e.values.favorite;
  const p = edit(e, { favorite: true });
  await preflightEdit(p);
  await submit(edit(e, { favorite: true }));
  // Divergent boolean after first addition produces a candidate against the original empty base.
  p.command.edits[0].values.favorite = false;
  const result = await new SubmissionController(memoryStore()).start("edit", async () => p);
  assert.equal(result.kind, "committed-conflict");
  assert.equal((await getBookmark(s, e.id)).conflicts.favorite.length, 2);
});
test("trash race keeps life conflict; pre-existing trash is rejected", async () => {
  const e = await bookmark(),
    p = edit(e, { note: "mine" });
  await preflightEdit(p);
  await write([{ entity: e.id, base: e.heads, values: { life: "trashed" } }]);
  assert.throws(() => editBaseline({ ...e, values: { ...e.values, life: "trashed" } }));
  assert.equal(
    (await new SubmissionController(memoryStore()).start("edit", async () => p)).kind,
    "committed-conflict",
  );
  assert.equal((await getBookmark(s, e.id)).conflicts.life.length, 2);
});
test("collection deletion race is a committed structural issue", async () => {
  const e = await bookmark(),
    collection = randomUUID();
  await write([
    {
      entity: collection,
      kind: "collection",
      base: {},
      values: { name: "Target", position: { parent: null, order: 1 } },
    },
  ]);
  const p = prepareEdit(e, editBaseline(e), { ...editBaseline(e), collection }, randomUUID(), s, {
    collections: [collection],
  })!;
  await preflightEdit(p);
  const c = (await rpc(installation, "get", { id: collection }, s.libraryId)) as Entity;
  await write([{ entity: c.id, base: c.heads, values: { life: "trashed" } }]);
  assert.equal(
    (await new SubmissionController(memoryStore()).start("edit", async () => p)).kind,
    "committed-conflict",
  );
  assert.ok((await getBookmark(s, e.id)).structural.some((issue) => issue.reason === "deleted-parent"));
});
test("redirect removal writes original alias members with their versions", async () => {
  const e = await bookmark(),
    alias = randomUUID(),
    canonical = randomUUID();
  await write([
    { entity: canonical, kind: "tag", values: { name: "Canonical" }, base: {} },
    { entity: alias, kind: "tag", values: { name: "Alias", redirect: canonical }, base: {} },
  ]);
  await write([
    { entity: e.id, base: e.heads, values: { ["tag:" + alias]: true, ["tag:" + canonical]: true } },
  ]);
  const current = await getBookmark(s, e.id),
    tags = await Promise.all(
      [alias, canonical].map((id) => rpc(installation, "get", { id }, s.libraryId) as Promise<Entity>),
    );
  const p = prepareEdit(
    current,
    editBaseline(current),
    { ...editBaseline(current), tags: [] },
    randomUUID(),
    s,
    { tags: tagChoices(tags, [alias, canonical]) },
  )!;
  await submit(p);
  const result = await getBookmark(s, e.id);
  assert.equal(result.values["tag:" + alias], false);
  assert.equal(result.values["tag:" + canonical], false);
});
test("lost execute response survives remount, verifies original command, creates once", async () => {
  const broken = wrapper(
    "lost",
    "const result=call(); if(req.method==='execute') process.stdout.write('invalid'); else process.stdout.write(result.stdout);",
  );
  const p = prepareSave({ entries: [{ url: "https://example.org/lost" }], tags: [] }, randomUUID(), broken),
    store = memoryStore();
  const first = await new SubmissionController(store).start("create", async () => p);
  assert.equal(first.kind, "pending");
  const raw = JSON.parse((await store.getItem("me.pendingSubmission.v1"))!);
  assert.deepEqual(raw.command, p.command);
  assert.equal((await new SubmissionController(store).recover(s)).kind, "committed");
  assert.equal((await findSaved(s, ["https://example.org/lost"])).length, 1);
  const changed = structuredClone(p);
  changed.session = s;
  changed.command.edits[0].values.note = "collision";
  await assert.rejects(submit(changed), { code: "ID_COLLISION" });
});
test("not-found recovery replays original command and read failures never re-execute", async () => {
  const broken = wrapper(
    "not-sent",
    "if(req.method==='execute') console.log(JSON.stringify({v:1,id:req.id,ok:false,error:{code:'IO',message:'before write'}})); else process.stdout.write(call().stdout);",
  );
  const e = await bookmark(),
    p = { ...edit(e, { note: "retry" }), session: broken },
    store = memoryStore();
  assert.equal((await new SubmissionController(store).start("edit", async () => p)).kind, "pending");
  assert.equal((await commandState({ ...p, session: s })).state, "not-found");
  assert.equal((await new SubmissionController(store).recover(s)).kind, "committed");
  const unreadable = wrapper(
    "get-failed",
    "if(req.method==='get') console.log(JSON.stringify({v:1,id:req.id,ok:false,error:{code:'IO',message:'read fail'}})); else process.stdout.write(call().stdout);",
  );
  const next = { ...edit(await getBookmark(s, e.id), { note: "read retry" }), session: unreadable };
  assert.equal(
    (await new SubmissionController(store).start("edit", async () => next)).kind,
    "committed-read-failed",
  );
  const forbid = wrapper(
    "forbid-execute",
    "if(req.method==='execute') throw Error('must not execute'); else process.stdout.write(call().stdout);",
  );
  assert.equal((await new SubmissionController(store).recover(forbid)).kind, "committed");
});
test("op persisted before cache IO failure recovers the original write", { skip: !!installed }, async () => {
  const file = join(root, "cache-failure.py");
  writeFileSync(
    file,
    `import sys\nsys.path.insert(0,${JSON.stringify(dirname(host))})\nimport core, host\noriginal=core.atomic\ndef failing(path,value):\n    if path.name=='library.json': raise OSError('injected cache IO failure')\n    return original(path,value)\ncore.atomic=failing\nhost.main()\n`,
  );
  const broken = {
    ...s,
    installation: { ...installation, args: [python, file, "--stdio", "--config", join(root, "config")] },
  };
  const e = await bookmark(),
    p = { ...edit(e, { note: "cache failure" }), session: broken },
    store = memoryStore();
  const first = await new SubmissionController(store).start("edit", async () => p);
  assert.equal(first.kind, "pending");
  assert.equal((await commandState({ ...p, session: s })).state, "committed-readable");
  assert.equal((await new SubmissionController(store).recover(s)).kind, "committed");
  assert.equal((await getBookmark(s, e.id)).values.note, "cache failure");
});
test("strict get rejects swapped entity and wrong kind", async () => {
  for (const altered of ["result.id='different';", "result.kind='tag';"]) {
    const wrong = wrapper(
      "wrong-get",
      `const out=JSON.parse(call().stdout); if(req.method==='get'){const result=out.result;${altered}} process.stdout.write(JSON.stringify(out));`,
    );
    const e = await bookmark();
    await assert.rejects(getBookmark(wrong, e.id), { code: "INVALID_RESPONSE" });
  }
});

test("committed-recovering retains command until a missing dependency returns", async () => {
  const e = await bookmark(),
    p = edit(e, { note: "dependent" });
  await submit(p);
  const parentId = e.heads.title[0].split(":")[0];
  const folder = join(root, "library", "ops");
  const file = readdirSync(folder).find(
    (name) => JSON.parse(readFileSync(join(folder, name), "utf8")).id === parentId,
  )!;
  const held = join(root, "held-op.json");
  renameSync(join(folder, file), held);
  const store = memoryStore();
  await store.setItem(
    "me.pendingSubmission.v1",
    JSON.stringify({
      command: p.command,
      libraryId: s.libraryId,
      entities: [e.id],
      mode: "edit",
      phase: "execute",
    }),
  );
  try {
    assert.equal((await commandState(p)).state, "committed-recovering");
    const result = await new SubmissionController(store).recover(s);
    assert.equal(result.kind, "pending");
    assert.equal(JSON.parse((await store.getItem("me.pendingSubmission.v1"))!).phase, "recovering");
  } finally {
    renameSync(held, join(folder, file));
  }
  assert.equal((await new SubmissionController(store).recover(s)).kind, "committed");
});

test("fresh process restores the original intent after acknowledgement or readback failure", async (t) => {
  for (const mode of ["edit", "create"] as const) {
    for (const fault of ["acknowledgement-write", "readback"] as const) {
      await t.test(`${mode}: ${fault}`, async () => {
        const prefix = join(root, `${mode}-${fault}`),
          pendingFile = prefix + ".pending.json",
          traceFile = prefix + ".rpc.jsonl",
          faultFile = prefix + ".fault";
        writeFileSync(faultFile, fault);
        const traced = wrapper(
          `${mode}-${fault}`,
          `const fs=require('node:fs');const out=req.method==='get'&&fs.readFileSync(${JSON.stringify(faultFile)},'utf8')==='readback'
            ? JSON.stringify({v:1,id:req.id,ok:false,error:{code:'IO',message:'injected readback failure'}})
            : call().stdout.toString();
          fs.appendFileSync(${JSON.stringify(traceFile)},JSON.stringify({request:req,response:JSON.parse(out)})+'\\n');
          process.stdout.write(out);`,
        );
        const p =
          mode === "edit"
            ? { ...edit(await bookmark(), { note: "process restart verified" }), session: traced }
            : prepareSave(
                { entries: [{ url: "https://example.org/reentry-" + randomUUID() }], tags: [] },
                randomUUID(),
                traced,
              );
        const run = (action: "start" | "recover") =>
          JSON.parse(
            execFileSync(process.execPath, ["--import", "tsx", "tests/fixtures/submission-process.ts"], {
              encoding: "utf8",
              timeout: 30000,
              input: JSON.stringify({
                action,
                mode,
                file: pendingFile,
                failAcknowledgement: action === "start" && fault === "acknowledgement-write",
                submission: p,
                session: traced,
              }),
            }),
          );
        const trace = () =>
          readFileSync(traceFile, "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));
        const operations = () =>
          Object.fromEntries(
            readdirSync(join(root, "library", "ops"))
              .sort()
              .map((name) => [name, readFileSync(join(root, "library", "ops", name), "utf8")]),
          );
        const first = run("start");
        assert.equal(first.outcome.kind, "committed-read-failed");
        assert.equal(first.record.phase, "committed");
        const persisted = JSON.parse(readFileSync(pendingFile, "utf8"));
        assert.equal(persisted.phase, fault === "acknowledgement-write" ? "execute" : "committed");
        assert.deepEqual(persisted.command, p.command);
        const initialCalls = trace();
        const receipt = initialCalls.find((r) => r.request.method === "execute").response;
        assert.equal(receipt.ok, true);
        assert.equal(receipt.result.state, "committed-readable");
        assert.equal(receipt.result.commandId, p.command.id);
        const entityBefore = await getBookmark(s, p.command.edits[0].entity),
          stateBefore = await commandState({ ...p, session: s }),
          opsBefore = operations();
        writeFileSync(faultFile, "normal");
        const again = run("recover");
        assert.notEqual(again.pid, first.pid);
        assert.deepEqual(again.loaded, persisted);
        assert.equal(again.guard.kind, "pending");
        assert.equal(again.prepared, false);
        assert.equal(again.outcome.kind, "committed");
        assert.equal(again.record, undefined);
        assert.equal(existsSync(pendingFile), false);
        const recoveryCalls = trace().slice(initialCalls.length);
        if (fault === "acknowledgement-write") {
          const check = recoveryCalls.findIndex((r) => r.request.method === "commandStatus"),
            replay = recoveryCalls.findIndex((r) => r.request.method === "execute");
          assert.ok(check >= 0 && replay > check);
          assert.equal(recoveryCalls[check].response.result.state, "committed-readable");
          assert.deepEqual(recoveryCalls[replay].request.params, p.command);
          assert.equal(recoveryCalls.filter((r) => r.request.method === "execute").length, 1);
        } else {
          assert.ok(recoveryCalls.every((r) => !["execute", "commandStatus"].includes(r.request.method)));
        }
        assert.deepEqual(await getBookmark(s, p.command.edits[0].entity), entityBefore);
        assert.deepEqual(await commandState({ ...p, session: s }), stateBefore);
        assert.deepEqual(operations(), opsBefore);
        t.diagnostic(
          JSON.stringify({
            mode,
            fault,
            processIds: [first.pid, again.pid],
            commandId: p.command.id,
            durablePhase: persisted.phase,
            recoveryMethods: recoveryCalls.map((r) => r.request.method),
            recoveryPayloadUnchanged: true,
            operationFilesAndEntityHeadsUnchanged: true,
            revisionUnchanged: stateBefore.revision,
            newPreparationBlocked: true,
            pendingCleared: true,
          }),
        );
      });
    }
  }
});
