require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } =
  require("node:fs");
const { tmpdir } = require("node:os");
const { join, dirname } = require("node:path");
const {
  CliChatClient,
  readWorkbuddyCatalog,
} = require("../src/provider-cli.ts");

const remoteId = "11111111-2222-4333-8444-555555555555";
const differentId = "99999999-2222-4333-8444-555555555555";
const selection = { model: "__cli_default__", effort: "" };
const completed = (event) => event.method === "turn/completed";
const delta = (event) => event.method === "item/agentMessage/delta";

// The real executable resolver accepts the fixture's JS entrypoint, then the
// production adapter launches Node. No mocked spawn/readline/termination code.
function fixture(t, provider, body, store, product) {
  const dir = mkdtempSync(join(tmpdir(), "raycast-cli-"));
  const cli = product
    ? join(dir, "app.asar.unpacked", "cli", "bin", "codebuddy")
    : join(dir, "fixture.cjs");
  mkdirSync(dirname(cli), { recursive: true });
  const productPath = join(dirname(dirname(cli)), "product.json");
  if (product) writeFileSync(productPath, JSON.stringify(product));
  writeFileSync(
    cli,
    `const args=process.argv.slice(2);const emit=x=>console.log(JSON.stringify(x));
if(args.includes('--version')){console.log('fixture 1.0');process.exit(0)}
if(args.includes('--list-models')){console.log('MODEL\\nTest-Model');process.exit(0)}
if(args.includes('--help')){console.log('--model <model> Currently supported: (fast-model, balanced-model, primary-model, deep-model)\\n--effort <level> Reasoning effort level (minimal, low, medium, high, xhigh, max)');process.exit(0)}
const gemini=${provider === "gemini"};
const prompt=gemini?args.find(x=>x.startsWith('--prompt=')).slice('--prompt='.length):args.at(-1);
const resumed=args.includes('--resume')?args[args.indexOf('--resume')+1]:undefined;
const id=resumed||'${remoteId}';
const init=(session=id)=>emit(gemini?{type:'init',session_id:session}:{type:'system',subtype:'init',session_id:session});
const chunk=text=>emit(gemini?{type:'message',role:'assistant',delta:true,content:text}:{type:'stream_event',session_id:id,event:{type:'content_block_delta',delta:{type:'text_delta',text}}});
const success=(text,session=id)=>{if(gemini){emit({type:'message',role:'assistant',content:text});emit({type:'result',status:'success'});}else emit({type:'result',subtype:'success',is_error:false,session_id:session,result:text,permission_denials:[]});};
${body}`,
  );
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
    const value = new CliChatClient({
      provider,
      cliPath: cli,
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
    cli,
    productPath,
    wait: (match) => new Promise((resolve) => waiters.push({ match, resolve })),
  };
}

async function prepare(client, id, start = true) {
  await client.connect();
  await client.checkAuthentication();
  await client.listModels();
  if (id) return client.resumeThread(id);
  if (start) return client.startThread();
}

const normal = `init();chunk('part');success(JSON.stringify({id,resumed:resumed||null,prompt,argv:args}));`;

for (const provider of ["qoder-cn", "gemini"]) {
  test(
    `${provider} production client preserves literal prompts and exact resume after restart`,
    { timeout: 15000 },
    async (t) => {
      const f = fixture(t, provider, normal);
      const first = f.client();
      const id = await prepare(first);
      const prompt = '--help $(echo must-stay-literal) & "quotes"\nsecond line';
      let done = f.wait(completed);
      await first.startTurn(prompt, selection);
      assert.equal((await done).params.turn.status, "completed");
      let answer = JSON.parse(
        f.events.filter((e) => e.method === "item/completed").at(-1).params.item
          .text,
      );
      assert.equal(answer.prompt, prompt);
      assert.equal(answer.resumed, null);
      assert.equal(answer.argv.includes("--continue"), false);
      assert.equal(f.saved.get(id), remoteId);
      assert.equal(
        f.events.find(delta).params.itemId,
        f.events.filter((e) => e.method === "item/completed").at(-1).params.item
          .id,
      );
      first.close();
      const next = f.client();
      assert.equal(await prepare(next, id), id);
      done = f.wait(completed);
      await next.startTurn("follow-up", selection);
      assert.equal((await done).params.turn.status, "completed");
      answer = JSON.parse(
        f.events.filter((e) => e.method === "item/completed").at(-1).params.item
          .text,
      );
      assert.equal(answer.resumed, remoteId);
      assert.equal(answer.id, remoteId);
      done = f.wait(completed);
      await next.startTurn("immediate next turn", selection);
      assert.equal((await done).params.turn.status, "completed");
    },
  );

  test(
    `${provider} cancellation waits for the process and can immediately continue the same session`,
    { timeout: 15000 },
    async (t) => {
      const f = fixture(
        t,
        provider,
        `init();if(prompt==='hold'){chunk(String(process.pid));setInterval(()=>{},1000);}else success(resumed||'missing-resume');`,
      );
      const client = f.client();
      const id = await prepare(client);
      const firstChunk = f.wait(delta);
      const done = f.wait(completed);
      await client.startTurn("hold", selection);
      const pid = Number((await firstChunk).params.delta);
      await client.interrupt();
      assert.equal((await done).params.turn.status, "interrupted");
      assert.equal(client.currentTurnId, null);
      assert.throws(() => process.kill(pid, 0), /ESRCH/);
      assert.equal(f.saved.get(id), remoteId);
      const next = f.wait(completed);
      await client.startTurn("continue", selection);
      assert.equal((await next).params.turn.status, "completed");
      assert.equal(
        f.events.filter((e) => e.method === "item/completed").at(-1).params.item
          .text,
        remoteId,
      );
      assert.equal(f.events.filter(completed).length, 2);
    },
  );

  test(
    `${provider} rejects a mismatched resumed session without overwriting its mapping`,
    { timeout: 15000 },
    async (t) => {
      const f = fixture(
        t,
        provider,
        `init('${differentId}');success('foreign','${differentId}');`,
      );
      const id = `${provider}:11111111-1111-1111-1111-111111111111`;
      f.saved.set(id, remoteId);
      const client = f.client();
      await prepare(client, id);
      const done = f.wait(completed);
      await client.startTurn("test", selection);
      assert.equal((await done).params.turn.status, "failed");
      assert.equal(f.saved.get(id), remoteId);
      assert.equal(
        f.events.some((e) => e.method === "item/completed"),
        false,
      );
    },
  );

  for (const [name, body] of [
    ["missing session ID", `success('unconfirmed',undefined);`],
    ["exit without terminal result", `init();chunk('partial');`],
    [
      "authentication failure with exit zero",
      `init();emit(gemini?{type:'result',status:'error',error:{message:'Authentication required'}}:{type:'result',subtype:'error_during_execution',is_error:true,session_id:id,errors:['Authentication required']});`,
    ],
  ])
    test(
      `${provider} reports failure on ${name}`,
      { timeout: 15000 },
      async (t) => {
        // Qoder success() defaults its session parameter; emit the omitted-ID shape directly.
        const testBody =
          name === "missing session ID"
            ? `emit(gemini?{type:'result',status:'success'}:{type:'result',subtype:'success',is_error:false,result:'unconfirmed',permission_denials:[]});`
            : body;
        const f = fixture(t, provider, testBody);
        const client = f.client();
        await prepare(client);
        const done = f.wait(completed);
        await client.startTurn("test", selection);
        assert.equal((await done).params.turn.status, "failed");
        assert.equal(f.events.filter(completed).length, 1);
      },
    );

  test(
    `${provider} waits for durable mapping before completing`,
    { timeout: 15000 },
    async (t) => {
      let release;
      const pending = new Promise((resolve) => {
        release = resolve;
      });
      let persisted = false;
      const f = fixture(t, provider, normal, {
        get: async () => undefined,
        set: async () => {
          await pending;
          persisted = true;
        },
      });
      const client = f.client();
      await prepare(client);
      const firstChunk = f.wait(delta);
      const done = f.wait(completed);
      await client.startTurn("test", selection);
      await firstChunk;
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(f.events.filter(completed).length, 0);
      release();
      assert.equal((await done).params.turn.status, "completed");
      assert.equal(persisted, true);
    },
  );

  test(
    `${provider} delayed failed persistence overrides an already received success result`,
    { timeout: 15000 },
    async (t) => {
      let reject;
      const pending = new Promise((_, fail) => {
        reject = fail;
      });
      const f = fixture(t, provider, normal, {
        get: async () => undefined,
        set: async () => pending,
      });
      const client = f.client();
      await prepare(client);
      const snapshot = f.wait((e) => e.method === "item/completed");
      const done = f.wait(completed);
      await client.startTurn("test", selection);
      await snapshot;
      assert.equal(f.events.filter(completed).length, 0);
      reject(new Error("storage unavailable"));
      const result = await done;
      assert.equal(result.params.turn.status, "failed");
      assert.match(result.params.turn.error.message, /save/);
      assert.equal(client.currentTurnId, null);
    },
  );

  test(`${provider} rejects foreign history before querying session storage`, async () => {
    const client = new CliChatClient({
      provider,
      onEvent: () => {},
      sessions: {
        get: async () => {
          throw Error("must not read foreign store");
        },
        set: async () => {},
      },
    });
    await assert.rejects(
      client.resumeThread("codex:11111111-1111-1111-1111-111111111111"),
      /different CLI/,
    );
  });
}

test(
  "fresh CLI client accepts only one overlapping first turn",
  { timeout: 15000 },
  async (t) => {
    const f = fixture(
      t,
      "qoder-cn",
      `init();chunk(String(process.pid));setTimeout(()=>success('finished'),200);`,
    );
    const client = f.client();
    await prepare(client, undefined, false);
    const results = await Promise.allSettled([
      client.startTurn("first", selection),
      client.startTurn("second", selection),
    ]);
    // Always let both fixtures finish if a regression accidentally launched two.
    await new Promise((resolve) => setTimeout(resolve, 700));
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.equal(
      results.filter((result) => result.status === "rejected").length,
      1,
    );
    assert.equal(f.events.filter((e) => e.method === "turn/started").length, 1);
  },
);

test(
  "Gemini rejects a conflicting session ID in a terminal event after valid init",
  { timeout: 15000 },
  async (t) => {
    const f = fixture(
      t,
      "gemini",
      `init();emit({type:'result',status:'success',session_id:'${differentId}'});`,
    );
    const c = f.client();
    const id = "gemini:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    f.saved.set(id, remoteId);
    await prepare(c, id);
    const done = f.wait(completed);
    await c.startTurn("test", selection);
    assert.equal((await done).params.turn.status, "failed");
    assert.equal(f.saved.get(id), remoteId);
  },
);

const workbuddyProduct = {
  models: [
    {
      id: "hy3",
      name: "Hy3",
      supportsToolCall: true,
      supportsReasoning: true,
      reasoning: { supportedEfforts: ["low", "high"], defaultEffort: "high" },
    },
    {
      id: "fast-model",
      name: "Fast",
      supportsToolCall: true,
      supportsReasoning: true,
      reasoning: { effort: "medium" },
    },
  ],
};

test(
  "WorkBuddy uses its selected bundle catalog and passes only its model-advertised effort",
  { timeout: 15000 },
  async (t) => {
    const f = fixture(t, "workbuddy", normal, undefined, workbuddyProduct);
    const client = f.client();
    await prepare(client);
    const models = await client.listModels();
    assert.deepEqual(
      models.find((model) => model.model === "hy3"),
      {
        model: "hy3",
        displayName: "Hy3",
        efforts: ["low", "high"],
        defaultEffort: "high",
      },
    );
    assert.deepEqual(
      models.find((model) => model.model === "fast-model").efforts,
      [],
    );
    const done = f.wait(completed);
    await client.startTurn("literal prompt", { model: "hy3", effort: "low" });
    assert.equal((await done).params.turn.status, "completed");
    const answer = JSON.parse(
      f.events.filter((event) => event.method === "item/completed").at(-1)
        .params.item.text,
    );
    assert.equal(answer.argv[answer.argv.indexOf("--effort") + 1], "low");
    assert.deepEqual(client.currentModelSelection, {
      model: "hy3",
      effort: "low",
    });
    const starts = f.events.filter(
      (event) => event.method === "turn/started",
    ).length;
    for (const choice of [
      { model: "hy3", effort: "medium" },
      { model: "fast-model", effort: "high" },
      { model: "__cli_default__", effort: "high" },
    ])
      await assert.rejects(
        client.startTurn("must not spawn", choice),
        /not advertised/,
      );
    assert.equal(
      f.events.filter((event) => event.method === "turn/started").length,
      starts,
    );
  },
);

test(
  "WorkBuddy refresh rejects stale effort choices and falls back to help when static metadata becomes unreadable",
  { timeout: 15000 },
  async (t) => {
    const f = fixture(t, "workbuddy", normal, undefined, workbuddyProduct);
    const client = f.client();
    await prepare(client);
    writeFileSync(
      f.productPath,
      JSON.stringify({
        models: [
          {
            ...workbuddyProduct.models[0],
            reasoning: { supportedEfforts: ["low"], defaultEffort: "low" },
          },
        ],
      }),
    );
    assert.deepEqual(
      (await client.listModels()).find((model) => model.model === "hy3")
        .efforts,
      ["low"],
    );
    await assert.rejects(
      client.startTurn("stale high", { model: "hy3", effort: "high" }),
      /not advertised/,
    );
    writeFileSync(f.productPath, "{invalid JSON");
    const fallback = await client.listModels();
    assert.equal(
      fallback.some((model) => model.model === "hy3"),
      false,
    );
    assert.deepEqual(
      fallback.find((model) => model.model === "fast-model").efforts,
      [],
    );
  },
);

test(
  "WorkBuddy does not expose effort choices when the selected CLI help lacks its effort flag",
  { timeout: 15000 },
  async (t) => {
    const f = fixture(t, "workbuddy", normal, undefined, workbuddyProduct);
    // Simulate an older installed CLI next to a newer product file.
    const fs = require("node:fs");
    fs.writeFileSync(
      f.cli,
      fs
        .readFileSync(f.cli, "utf8")
        .replace("--effort <level>", "--unsupported <level>"),
    );
    const client = f.client();
    await prepare(client);
    assert.deepEqual(
      (await client.listModels()).find((model) => model.model === "hy3")
        .efforts,
      [],
    );
    await assert.rejects(
      client.startTurn("test", { model: "hy3", effort: "low" }),
      /not advertised/,
    );
  },
);

test("WorkBuddy static metadata is bounded and cannot be loaded from an unrelated executable", async (t) => {
  const f = fixture(t, "workbuddy", normal, undefined, workbuddyProduct);
  const executable = { command: process.execPath, prefix: [f.cli], env: {} };
  assert.equal(readWorkbuddyCatalog(executable)[0].model, "hy3");
  assert.deepEqual(
    readWorkbuddyCatalog({ ...executable, prefix: [process.execPath] }),
    [],
  );
  writeFileSync(f.productPath, " ".repeat(1024 * 1024 + 1));
  assert.deepEqual(readWorkbuddyCatalog(executable), []);
});

test("WorkBuddy rejects product metadata whose real path is outside the chosen bundle", async (t) => {
  const f = fixture(t, "workbuddy", normal, undefined, workbuddyProduct);
  const outside = join(
    dirname(dirname(dirname(dirname(f.cli)))),
    "foreign-product.json",
  );
  writeFileSync(outside, JSON.stringify(workbuddyProduct));
  const fs = require("node:fs");
  // Prefer a real symlink; mock only where creating one is restricted (Windows).
  let linked = false;
  try {
    rmSync(f.productPath);
    symlinkSync(outside, f.productPath);
    linked = true;
  } catch {
    writeFileSync(f.productPath, JSON.stringify(workbuddyProduct));
  }
  if (!linked) {
    const realpath = fs.realpathSync;
    t.mock.method(fs, "realpathSync", (value) =>
      value === f.productPath ? outside : realpath(value),
    );
  }
  assert.deepEqual(
    readWorkbuddyCatalog({
      command: process.execPath,
      prefix: [f.cli],
      env: {},
    }),
    [],
  );
});

for (const provider of ["qoder-cn", "gemini"])
  test(
    `${provider} rejects non-empty effort instead of silently discarding it`,
    { timeout: 15000 },
    async (t) => {
      const f = fixture(t, provider, normal);
      const client = f.client();
      await prepare(client);
      await assert.rejects(
        client.startTurn("must not spawn", { ...selection, effort: "high" }),
        /not advertised/,
      );
      assert.equal(
        f.events.some((event) => event.method === "turn/started"),
        false,
      );
    },
  );
