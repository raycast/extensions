const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { fork } = require("node:child_process");
const { once } = require("node:events");
const { createFixture, loadSource, sqliteSupportsTrigram, directoryQuery } = require("./database-fixture.cjs");
const indexedOnly = { skip: !sqliteSupportsTrigram() && "system SQLite with FTS5/trigram is unavailable" };

function deferred() {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
}

test("overlapping indexed and fallback rebuilds keep each returned search path valid", indexedOnly, async () => {
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

test(
  "an interrupted process preserves the published index and the next launch removes its abandoned files",
  indexedOnly,
  async () => {
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
  }
);

test("publication failure leaves the previous searchable database intact and can be retried", indexedOnly, async () => {
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

test(
  "merged indexes support bounded browsing, full-content search and detail reads across repeated launches",
  indexedOnly,
  async () => {
    const fixture = await createFixture({ noteCount: 205 });
    try {
      const state = await fixture.create_or_update_db();
      assert.equal(
        await fixture.query(
          state,
          "SELECT count(*) FROM (SELECT GOID FROM Entities ORDER BY RecentTime DESC LIMIT 100)"
        ),
        "100"
      );
      assert.equal(
        await fixture.query(
          state,
          "SELECT count(*) FROM (SELECT GOID FROM Entities ORDER BY RecentTime DESC LIMIT 200)"
        ),
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
      assert.equal(
        await fixture.query(state, "SELECT length(Content) FROM Entities WHERE GOID = 'synthetic-1'"),
        "1219"
      );
      for (let i = 0; i < 3; i++) assert.deepEqual(await fixture.create_or_update_db(), state);
      assert.equal(fixture.indexCalls(), 1);
    } finally {
      await fixture.cleanup();
    }
  }
);

test("retries a failed full-text index without requiring a source index change", indexedOnly, async () => {
  let cachedPath;
  let copies = 0;
  const fixture = await createFixture({
    execute: ({ call, execute }) => {
      if (call === 1) throw new Error("Synthetic temporary SQLite failure");
      return execute();
    },
    filesystem: {
      readFile: (...args) => {
        assert.notEqual(args[0], cachedPath, "index retries must not load the fallback payload into WASM");
        return fs.readFile(...args);
      },
      copyFile: (...args) => {
        copies++;
        return fs.copyFile(...args);
      },
    },
  });
  try {
    const first = await fixture.create_or_update_db();
    cachedPath = first.databasePath;
    assert.equal(first.fullTextIndexed, false);
    const second = await fixture.create_or_update_db();
    assert.equal(second.fullTextIndexed, true);
    assert.equal(fixture.indexCalls(), 2);
    assert.equal(copies, 1, "the existing fallback is cloned once for the retry");
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

test(
  "a fresh invocation reads per-file index state and rebuilds after source changes or a legacy cache",
  indexedOnly,
  async () => {
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
  }
);

test(
  "older runtimes read cache metadata with system SQLite without importing the database payload",
  indexedOnly,
  async () => {
    const fixture = await createFixture();
    try {
      const original = await fixture.create_or_update_db();
      const older = await createFixture({
        root: fixture.root,
        nativeSQLite: {
          DatabaseSync: class {
            constructor() {
              throw new Error("Synthetic native SQLite unavailable");
            }
          },
        },
        filesystem: {
          readFile: () => {
            throw new Error("Cache payload must stay on disk");
          },
        },
      });
      assert.deepEqual(await older.create_or_update_db(), original);
      assert.equal(older.indexCalls(), 0);
    } finally {
      await fixture.cleanup();
    }
  }
);

test("fallback searches work without system SQLite and unchanged launches avoid reading or copying the cached payload", async () => {
  let ready;
  let copies = 0;
  const fixture = await createFixture({
    execute: () => {
      throw Object.assign(new Error("Synthetic SQLite unavailable"), { code: "ENOENT" });
    },
    filesystem: {
      readFile: (...args) => {
        assert.notEqual(
          args[0],
          ready?.databasePath,
          "cached payload must not be loaded into memory for an index retry"
        );
        return fs.readFile(...args);
      },
      copyFile: (...args) => {
        copies++;
        return fs.copyFile(...args);
      },
    },
  });
  try {
    ready = await fixture.create_or_update_db();
    assert.equal(ready.fullTextIndexed, false);
    assert.equal(
      await fixture.query(
        ready,
        `SELECT count(*) FROM Entities WHERE 1 = 1 ${fixture.search.searchCondition("needle graph", false)}`
      ),
      "1"
    );
    for (let i = 0; i < 3; i++) assert.deepEqual(await fixture.create_or_update_db(), ready);
    assert.equal(copies, 0, "an unavailable tokenizer does not copy and rebuild the unchanged database");
    assert.equal(fixture.indexCalls(), 1);
  } finally {
    await fixture.cleanup();
  }
});

test("large-library lists resolve only each note's indexed ancestor IDs", async () => {
  const fixture = await createFixture({
    execute: () => {
      throw new Error("Synthetic unindexed fixture");
    },
  });
  try {
    const source = new fixture.SQL.Database(await fs.readFile(fixture.indexFile));
    try {
      const insert = source.prepare(
        "INSERT INTO Entities (Type, GOID, GUID, Title, RecentTime) VALUES (2, ?, ?, ?, 0)"
      );
      for (let index = 0; index < 5000; index++)
        insert.run([`unrelated-${index}`, `guid-${index}`, `Unrelated section ${index}`]);
      insert.free();
      source.run(
        "INSERT INTO Entities (Type, GOID, GUID, Title) VALUES (4, '{notebook}{1}', 'notebook-guid', 'Synthetic notebook'), (3, '{group}{1}', 'group-guid', 'Synthetic group'), (2, 'synthetic-section', 'section-guid', 'Synthetic section')"
      );
      source.run("UPDATE Entities SET GrandparentGOIDs = '{notebook}{1}{group}{1}' WHERE Type = 1");
      await fs.writeFile(fixture.indexFile, Buffer.from(source.export()));
    } finally {
      source.close();
    }
    const state = await fixture.create_or_update_db();
    const db = new fixture.SQL.Database(await fs.readFile(state.databasePath));
    try {
      const query = directoryQuery();
      const plan = db
        .exec(`EXPLAIN QUERY PLAN ${query}`)[0]
        .values.map((row) => row[3])
        .join("\n");
      assert.match(plan, /SEARCH Ancestor USING INDEX Entities_GOID \(GOID=\?\)/);
      assert.doesNotMatch(plan, /SCAN Ancestor|SEARCH Ancestor.*\(Type/);
      const result = db.exec(query)[0];
      const row = result.values.find((row) => row[result.columns.indexOf("GOID")] === "synthetic-1");
      assert.equal(row[result.columns.indexOf("ParentTitle")], "Synthetic section");
      assert.deepEqual(JSON.parse(row[result.columns.indexOf("GrandparentTitles")]), {
        "{notebook}{1}": "Synthetic notebook",
        "{group}{1}": "Synthetic group",
      });
    } finally {
      db.close();
    }
  } finally {
    await fixture.cleanup();
  }
});

test("ancestor labels come from each database version rather than a shared cache", indexedOnly, async () => {
  const fixture = await createFixture({
    execute: ({ call, execute }) => {
      if (call === 2) throw new Error("Synthetic temporary SQLite failure");
      return execute();
    },
  });
  const notebook = "{notebook}{1}";
  try {
    const source = new fixture.SQL.Database(await fs.readFile(fixture.indexFile));
    source.run(
      "INSERT INTO Entities (Type, GOID, GUID, Title) VALUES (4, ?, 'notebook-guid', 'Old notebook'), (2, 'synthetic-section', 'section-guid', 'Old section')",
      [notebook]
    );
    source.run("UPDATE Entities SET GrandparentGOIDs = ? WHERE Type = 1", [notebook]);
    await fs.writeFile(fixture.indexFile, Buffer.from(source.export()));
    const indexed = await fixture.create_or_update_db();
    source.run("UPDATE Entities SET Title = replace(Title, 'Old', 'New') WHERE Type > 1");
    await fs.writeFile(fixture.indexFile, Buffer.from(source.export()));
    source.close();
    const fallback = await fixture.create_or_update_db(true);
    const utils = loadSource("utils", {
      "./search": fixture.search,
      "@raycast/api": {
        Cache: class {
          get(id) {
            return fixture.storage.get(id);
          }
        },
      },
      "./types": loadSource("types", {}),
      dateformat: () => "",
      "run-applescript": {},
    });
    for (const [state, prefix] of [
      [indexed, "Old"],
      [fallback, "New"],
    ]) {
      const db = new fixture.SQL.Database(await fs.readFile(state.databasePath));
      try {
        const result = db.exec(directoryQuery())[0];
        const row = result.values.find((row) => row[result.columns.indexOf("GOID")] === "synthetic-1");
        const item = Object.fromEntries(result.columns.map((key, index) => [key, row[index]]));
        assert.equal(utils.getParentTitle(item), `${prefix} section`);
        assert.equal(utils.getAncestorsStr(item, " > ", false), `${prefix} notebook > ${prefix} section`);
      } finally {
        db.close();
      }
    }
    assert.equal(utils.getAncestorsStr({ GrandparentGOIDs: notebook, ParentGOID: "missing" }, " > ", false), "");
  } finally {
    await fixture.cleanup();
  }
});
