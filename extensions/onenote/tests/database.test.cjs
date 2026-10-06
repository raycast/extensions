const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { fork } = require("node:child_process");
const { once } = require("node:events");
const { createFixture } = require("./database-fixture.cjs");

function deferred() {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
}

test("overlapping indexed and fallback rebuilds keep each returned search path valid", async () => {
  const indexed = deferred();
  const release = deferred();
  const fixture = await createFixture({
    execute: async ({ call, execute }) => {
      if (call === 2) throw new Error("Synthetic temporary SQLite failure");
      const result = await execute();
      if (call === 1) {
        indexed.resolve();
        await release.promise;
      }
      return result;
    },
  });
  const first = fixture.create_or_update_db();
  try {
    await indexed.promise;
    const fallback = await fixture.create_or_update_db(true);
    release.resolve();
    const ready = await first;
    assert.equal(ready.fullTextIndexed, true);
    assert.equal(fallback.fullTextIndexed, false);
    for (const state of [ready, fallback]) {
      assert.equal(
        await fixture.query(
          state,
          `SELECT count(*) FROM Entities WHERE 1 = 1 ${fixture.search.searchCondition("graph", state.fullTextIndexed)}`
        ),
        "1"
      );
    }
  } finally {
    release.resolve();
    await first.catch(() => {});
    await fixture.cleanup();
  }
});

test("an interrupted process preserves the published index and the next launch removes its abandoned files", async () => {
  const fixture = await createFixture();
  let child;
  try {
    const ready = await fixture.create_or_update_db();
    const original = await fs.readFile(ready.databasePath);
    child = fork(path.join(__dirname, "interrupted-rebuild.cjs"), [fixture.root], {
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    const indexed = await Promise.race([
      once(child, "message"),
      once(child, "exit").then(([code]) => {
        throw new Error(`Synthetic rebuild exited early: ${code}`);
      }),
    ]);
    assert.equal(indexed[0], "indexed");
    assert.deepEqual(await fs.readFile(ready.databasePath), original, "only the private file is rebuilt");
    const exit = once(child, "exit");
    child.kill("SIGKILL");
    await exit;
    assert.equal(
      await fixture.query(
        ready,
        `SELECT count(*) FROM Entities WHERE 1 = 1 ${fixture.search.searchCondition("graph", true)}`
      ),
      "1"
    );
    await fixture.create_or_update_db();
    assert.deepEqual(
      (await fs.readdir(fixture.support)).filter((name) => name.startsWith("onenote-rebuild-")),
      []
    );
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exit = once(child, "exit");
      child.kill("SIGKILL");
      await exit;
    }
    await fixture.cleanup();
  }
});

test("publication failure leaves the previous searchable database intact and can be retried", async () => {
  let failPublish = false;
  const fixture = await createFixture({
    filesystem: {
      rename: async (...args) => {
        if (failPublish) throw new Error("Synthetic publication failure");
        return fs.rename(...args);
      },
    },
  });
  try {
    const ready = await fixture.create_or_update_db();
    const original = await fs.readFile(ready.databasePath);
    failPublish = true;
    await assert.rejects(fixture.create_or_update_db(true), /Synthetic publication failure/);
    assert.deepEqual(await fs.readFile(ready.databasePath), original);
    assert.deepEqual(
      (await fs.readdir(fixture.support)).filter((name) => name.startsWith("onenote-rebuild-")),
      []
    );
    failPublish = false;
    assert.equal((await fixture.create_or_update_db(true)).fullTextIndexed, true);
  } finally {
    await fixture.cleanup();
  }
});

test("merged indexes support bounded browsing, full-content search and detail reads across repeated launches", async () => {
  const fixture = await createFixture({ noteCount: 205 });
  try {
    const state = await fixture.create_or_update_db();
    assert.equal(
      await fixture.query(state, "SELECT count(*) FROM (SELECT GOID FROM Entities ORDER BY RecentTime DESC LIMIT 100)"),
      "100"
    );
    assert.equal(
      await fixture.query(state, "SELECT count(*) FROM (SELECT GOID FROM Entities ORDER BY RecentTime DESC LIMIT 200)"),
      "200"
    );
    assert.equal(
      await fixture.query(state, "SELECT count(*) FROM Entities WHERE ParentGOID = 'synthetic-section'"),
      "205"
    );
    assert.equal(
      await fixture.query(
        state,
        `SELECT count(*) FROM Entities WHERE 1 = 1 ${fixture.search.searchCondition("needle graph", true)}`
      ),
      "205"
    );
    assert.equal(
      await fixture.query(state, "SELECT length(substr(Content, 1, 1000)) FROM Entities WHERE GOID = 'synthetic-1'"),
      "1000"
    );
    assert.equal(await fixture.query(state, "SELECT length(Content) FROM Entities WHERE GOID = 'synthetic-1'"), "1219");
    for (let i = 0; i < 3; i++) assert.deepEqual(await fixture.create_or_update_db(), state);
    assert.equal(fixture.indexCalls(), 1);
  } finally {
    await fixture.cleanup();
  }
});

test("retries a failed full-text index without requiring a source index change", async () => {
  const fixture = await createFixture({
    execute: ({ call, execute }) => {
      if (call === 1) throw new Error("Synthetic temporary SQLite failure");
      return execute();
    },
  });
  try {
    const first = await fixture.create_or_update_db();
    assert.equal(first.fullTextIndexed, false);
    const second = await fixture.create_or_update_db();
    assert.equal(second.fullTextIndexed, true);
    assert.equal(fixture.indexCalls(), 2);
    assert.equal(
      await fixture.query(
        second,
        `SELECT count(*) FROM Entities WHERE 1 = 1 ${fixture.search.searchCondition("needle", true)}`
      ),
      "1"
    );
    await fixture.create_or_update_db();
    assert.equal(fixture.indexCalls(), 2, "reuses a successfully indexed unchanged database");
  } finally {
    await fixture.cleanup();
  }
});

test("a fresh invocation reads per-file index state and rebuilds after source changes or a legacy cache", async () => {
  const fixture = await createFixture();
  try {
    const original = await fixture.create_or_update_db();
    const fresh = await createFixture({ root: fixture.root });
    assert.deepEqual(await fresh.create_or_update_db(), original);
    assert.equal(fresh.indexCalls(), 0, "the database carries its own signature across invocations");

    const source = new fixture.SQL.Database(await fs.readFile(fixture.indexFile));
    try {
      source.run("UPDATE PageElements SET text = 'changed synthetic content'");
      await fs.writeFile(fixture.indexFile, Buffer.from(source.export()));
      await fs.utimes(fixture.indexFile, new Date(), new Date(Date.now() + 1000));
    } finally {
      source.close();
    }
    const changed = await fresh.create_or_update_db();
    assert.equal(
      await fixture.query(
        changed,
        `SELECT count(*) FROM Entities WHERE 1 = 1 ${fixture.search.searchCondition("changed", true)}`
      ),
      "1"
    );
    assert.equal(fresh.indexCalls(), 1);

    // An old/corrupt cache without this schema's metadata cannot claim a successful index.
    await fs.copyFile(fixture.indexFile, changed.databasePath);
    const recovered = await fresh.create_or_update_db();
    assert.equal(recovered.fullTextIndexed, true);
    assert.equal(fresh.indexCalls(), 2);
  } finally {
    await fixture.cleanup();
  }
});
