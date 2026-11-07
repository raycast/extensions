require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  AntigravityClient,
  parseAgyModels,
} = require("../src/provider-antigravity.ts");

// Run real subprocess I/O on every OS. Only the test fixture launch is routed
// through node: Windows cannot execute Unix shebang files. Production still
// launches the installed native agy binary without a shell.
function fixture(t, body, store) {
  const dir = mkdtempSync(join(tmpdir(), "raycast-agy-"));
  const cli = join(dir, "agy");
  writeFileSync(
    cli,
    `const args=process.argv.slice(2); const emit=x=>console.log(JSON.stringify(x));
if(args[0]==='models'){console.log('test-model\\tTest Model');process.exit(0)}
${body}`,
    { mode: 0o700 },
  );
  for (const method of ["execFile", "spawn"]) {
    const original = cp[method];
    t.mock.method(cp, method, (command, args, ...rest) =>
      command === cli
        ? original(process.execPath, [cli, ...args], ...rest)
        : original(command, args, ...rest),
    );
  }
  const saved = new Map();
  const sessions = store || {
    get: async (id) => saved.get(id),
    set: async (id, remote) => {
      saved.set(id, remote);
    },
  };
  const clients = [];
  const events = [];
  const waiters = [];
  function client() {
    const value = new AntigravityClient({
      agyPath: cli,
      cwd: dir,
      sessions,
      onEvent: (event) => {
        events.push(event);
        for (const waiter of [...waiters])
          if (waiter.match(event)) {
            waiters.splice(waiters.indexOf(waiter), 1);
            waiter.resolve(event);
          }
      },
    });
    clients.push(value);
    return value;
  }
  t.after(async () => {
    for (const value of clients) {
      await value.interrupt();
      value.close();
    }
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    client,
    saved,
    events,
    wait: (match) => new Promise((resolve) => waiters.push({ match, resolve })),
  };
}
const completed = (event) => event.method === "turn/completed";
const selection = { model: "test-model", effort: "" };
async function prepare(client, id) {
  await client.connect();
  await client.checkAuthentication();
  return id ? client.resumeThread(id) : client.startThread();
}
const normal = `const id=args.includes('--conversation')?args[args.indexOf('--conversation')+1]:'remote-123';
emit({event:'init',conversation_id:id});
emit({event:'step_update',step_update:{step_type:'agent_response',text_delta:'Hello'}});
emit({event:'result',result:{status:'SUCCESS',conversation_id:id,response:id+':'+args.at(-1)}});`;

test("AGY catalog ignores progress text and preserves model identities and labels", () => {
  assert.deepEqual(
    parseAgyModels("Fetching available models...\ngemini-high\tGemini High\n"),
    [
      {
        model: "gemini-high",
        displayName: "Gemini High",
        efforts: [],
        defaultEffort: "",
      },
    ],
  );
});

test("AGY never infers an effort menu from a model variant name or silently ignores a requested effort", async (t) => {
  assert.deepEqual(
    parseAgyModels(
      "gemini-3.8-flash-high\tGemini 3.8 Flash (High)\ngemini-3.8-flash-low\tGemini 3.8 Flash (Low)\n",
    ).map((model) => model.efforts),
    [[], []],
  );
  const f = fixture(t, normal);
  const client = f.client();
  await prepare(client);
  await assert.rejects(
    client.startTurn("must not start", { ...selection, effort: "high" }),
    /does not publish per-model/,
  );
  assert.equal(
    f.events.some((event) => event.method === "turn/started"),
    false,
  );
});

test(
  "AGY mapping survives restart and explicit resume; prompts remain literal and items keep their identity",
  { timeout: 10000 },
  async (t) => {
    const f = fixture(t, normal);
    const first = f.client();
    const id = await prepare(first);
    let done = f.wait(completed);
    await first.startTurn('literal $(echo unsafe) & "quoted"', selection);
    assert.equal((await done).params.turn.status, "completed");
    assert.equal(
      f.events.find((e) => e.method === "item/completed").params.item.text,
      'remote-123:literal $(echo unsafe) & "quoted"',
    );
    assert.equal(f.saved.get(id), "remote-123");
    first.close();
    const next = f.client();
    assert.equal(await prepare(next, id), id);
    done = f.wait(completed);
    await next.startTurn("follow-up", selection);
    await done;
    const items = f.events.filter((e) => e.method === "item/completed");
    assert.equal(items.at(-1).params.item.text, "remote-123:follow-up");
    assert.equal(
      f.events.find((e) => e.method === "item/agentMessage/delta").params
        .itemId,
      items[0].params.item.id,
    );
    // Completion means the transport is ready for another turn, not still closing.
    done = f.wait(completed);
    await next.startTurn("immediate next turn", selection);
    await done;
  },
);

test(
  "AGY cancellation waits for process cleanup and the same session can continue",
  { timeout: 10000 },
  async (t) => {
    const f = fixture(
      t,
      `const id='remote-123'; emit({event:'init',conversation_id:id});
if(args.at(-1)==='hold'){emit({event:'step_update',step_update:{step_type:'agent_response',text_delta:'partial'}});setInterval(()=>{},1000)}
else {emit({event:'result',result:{status:'SUCCESS',conversation_id:id,response:'continued'}})}`,
    );
    const client = f.client();
    const id = await prepare(client);
    const delta = f.wait((e) => e.method === "item/agentMessage/delta");
    const done = f.wait(completed);
    await client.startTurn("hold", selection);
    await delta;
    await client.interrupt();
    assert.equal((await done).params.turn.status, "interrupted");
    assert.equal(client.currentTurnId, null);
    assert.equal(f.saved.get(id), "remote-123");
    const next = f.wait(completed);
    await client.startTurn("continue", selection);
    assert.equal((await next).params.turn.status, "completed");
    assert.equal(f.events.filter(completed).length, 2);
  },
);

test(
  "AGY refuses to overwrite a resumed conversation with an unexpected remote ID",
  { timeout: 10000 },
  async (t) => {
    const f = fixture(t, normal);
    const id = "antigravity:11111111-1111-1111-1111-111111111111";
    f.saved.set(id, "expected-remote");
    const client = f.client();
    await prepare(client, id);
    // This fixture deliberately ignores --conversation.
    const spawn = cp.spawn;
    t.mock.method(cp, "spawn", (command, args, options) =>
      spawn(
        command,
        args.map((x) => (x === "expected-remote" ? "unexpected-remote" : x)),
        options,
      ),
    );
    const done = f.wait(completed);
    await client.startTurn("test", selection);
    assert.equal((await done).params.turn.status, "failed");
    assert.equal(f.saved.get(id), "expected-remote");
  },
);

for (const [name, body] of [
  [
    "missing conversation ID",
    `emit({event:'result',result:{status:'SUCCESS',response:'not resumable'}})`,
  ],
  ["exit without result", `emit({event:'init',conversation_id:'remote-123'});`],
  [
    "interactive approval",
    `emit({event:'init',conversation_id:'remote-123'});emit({event:'step_update',step_update:{step_type:'user_input_required'}});setInterval(()=>{},1000)`,
  ],
])
  test(`AGY fails explicitly on ${name}`, { timeout: 10000 }, async (t) => {
    const f = fixture(t, body);
    const client = f.client();
    await prepare(client);
    const done = f.wait(completed);
    await client.startTurn("test", selection);
    assert.equal((await done).params.turn.status, "failed");
    assert.equal(f.events.filter(completed).length, 1);
  });

test(
  "AGY cannot report success before the durable session mapping is saved",
  { timeout: 10000 },
  async (t) => {
    let release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    const f = fixture(t, normal, {
      get: async () => undefined,
      set: async () => pending,
    });
    const client = f.client();
    await prepare(client);
    const item = f.wait((e) => e.method === "item/agentMessage/delta");
    const done = f.wait(completed);
    await client.startTurn("test", selection);
    await item;
    assert.equal(f.events.filter(completed).length, 0);
    release();
    assert.equal((await done).params.turn.status, "completed");
  },
);

test(
  "AGY fails the turn when session mapping persistence fails",
  { timeout: 10000 },
  async (t) => {
    const f = fixture(t, normal, {
      get: async () => undefined,
      set: async () => {
        throw Error("disk error");
      },
    });
    const client = f.client();
    await prepare(client);
    const done = f.wait(completed);
    await client.startTurn("test", selection);
    assert.equal((await done).params.turn.status, "failed");
  },
);

test("AGY rejects a Codex thread before reading any foreign session storage", async () => {
  const client = new AntigravityClient({
    onEvent: () => {},
    sessions: {
      get: async () => {
        throw Error("must not read");
      },
      set: async () => {},
    },
  });
  await assert.rejects(client.resumeThread("codex-thread"), /different CLI/);
});
