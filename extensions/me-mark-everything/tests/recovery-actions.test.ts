import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import { Failure, type Session } from "../src/helper";
import { SubmissionController, PENDING_KEY } from "../src/helpers/submission";
import { memoryStore } from "./fixtures/library";

// Actual action + controller + stdio adapter; a deterministic protocol responder
// selects each status branch. This is not native Raycast/LocalStorage acceptance.
const root = mkdtempSync("/private/tmp/me-recovery-actions-");
after(() => rmSync(root, { recursive: true, force: true }));
const code = ts.transpileModule(readFileSync("src/components/SubmissionActions.tsx", "utf8"), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;

async function fixture(state: string, phase = "execute") {
  const dir = join(root, state + "-" + phase);
  const trace = dir + ".jsonl";
  const program = dir + ".cjs";
  writeFileSync(
    program,
    `const fs=require('node:fs');let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{
    const r=JSON.parse(input);fs.appendFileSync(${JSON.stringify(trace)},JSON.stringify(r)+'\\n');
    const results={capabilities:{protocol:1,schema:1,version:'test',commands:['query','get','execute','commandStatus','status','openManager','managerStatus'],library:{libraryId:'L'}},
      commandStatus:{state:${JSON.stringify(state)},revision:'r'},
      execute:{state:'committed-readable',revision:'r',commandId:'original',writtenHeads:{b:{title:['new']}}},
      get:{id:'b',kind:'bookmark',values:{life:'active'},heads:{},conflicts:{},policies:{},structural:[],purged:false},
      status:{library:{libraryId:'L'},configured:false,pending:0,syncing:false,conflicts:0,revision:'r',sync:{}}};
    console.log(JSON.stringify({v:1,id:r.id,ok:true,result:results[r.method]}));});`,
  );
  const session: Session = {
    libraryId: "L",
    discoveryPath: "unused",
    version: "test",
    installation: {
      executable: process.execPath,
      args: [program, "--stdio"],
      protocol: 1,
      extensionId: "a".repeat(32),
    },
  };
  const command = {
    id: "original",
    libraryId: "L",
    edits: [
      {
        entity: "b",
        kind: "bookmark",
        base: { life: ["opened-life"], title: ["opened-title"] },
        values: { life: "active", title: "Original input" },
      },
    ],
  };
  const raw = JSON.stringify({ command, libraryId: "L", entities: ["b"], mode: "edit", phase });
  const store = memoryStore();
  await store.setItem(PENDING_KEY, raw);
  const controller = new SubmissionController(store);
  let confirmations = 0,
    accepted = false,
    outcome: any;
  const module = { exports: {} as any };
  const mocks: Record<string, unknown> = {
    "react/jsx-runtime": jsx,
    "@raycast/api": {
      Action: "Action",
      Icon: {},
      Alert: { ActionStyle: { Default: "default" } },
      Toast: { Style: {} },
      showToast: async () => {},
      confirmAlert: async () => {
        confirmations++;
        return accepted;
      },
    },
    "@raycast/utils": { showFailureToast: async () => {} },
    "../helper": { Failure },
  };
  runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name: string) => {
      assert.ok(name in mocks, name);
      return mocks[name];
    },
    Error,
  });
  const view = module.exports.SubmissionActions({
    controller,
    session: async () => session,
    onOutcome: async (value: unknown) => {
      outcome = value;
    },
  });
  return {
    invoke: () => view.props.children.props.onAction(),
    accept: () => {
      accepted = true;
    },
    confirmations: () => confirmations,
    outcome: () => outcome,
    store,
    raw,
    command,
    requests: () =>
      existsSync(trace)
        ? readFileSync(trace, "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line))
        : [],
  };
}

test("not-found action cancellation keeps the record; confirmation retries exact ID, payload and heads", async () => {
  const f = await fixture("not-found");
  await f.invoke();
  assert.equal(f.confirmations(), 1);
  assert.equal(f.outcome().kind, "pending");
  assert.equal(await f.store.getItem(PENDING_KEY), f.raw);
  assert.equal(f.requests().filter((request) => request.method === "execute").length, 0);
  f.accept();
  await f.invoke();
  assert.equal(f.confirmations(), 2);
  assert.equal(f.outcome().kind, "committed");
  assert.deepEqual(
    f
      .requests()
      .filter((request) => request.method === "execute")
      .map((request) => request.params),
    [f.command],
  );
  assert.equal(await f.store.getItem(PENDING_KEY), undefined);
});
test("committed-readable verifies original payload without asking to retry", async () => {
  const f = await fixture("committed-readable");
  await f.invoke();
  assert.equal(f.confirmations(), 0);
  assert.equal(f.outcome().kind, "committed");
  assert.deepEqual(
    f
      .requests()
      .filter((request) => request.method === "execute")
      .map((request) => request.params),
    [f.command],
  );
});
test("durable committed phase only reads; committed-recovering keeps the command and waits", async () => {
  const committed = await fixture("committed-readable", "committed");
  await committed.invoke();
  assert.equal(committed.confirmations(), 0);
  assert.equal(committed.outcome().kind, "committed");
  assert.equal(
    committed.requests().some((request) => ["commandStatus", "execute"].includes(request.method)),
    false,
  );
  const recovering = await fixture("committed-recovering");
  await recovering.invoke();
  assert.equal(recovering.confirmations(), 0);
  assert.equal(recovering.outcome().kind, "pending");
  const saved = JSON.parse((await recovering.store.getItem(PENDING_KEY))!);
  assert.deepEqual(saved.command, recovering.command);
  assert.equal(saved.phase, "recovering");
  assert.equal(
    recovering.requests().some((request) => request.method === "execute"),
    false,
  );
});
