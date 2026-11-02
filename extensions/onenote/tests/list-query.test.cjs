const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadSource } = require("./database-fixture.cjs");

function listQuery(searchText, grouped = false) {
  let query;
  const state = [grouped ? 1 : 0, searchText, 100];
  const jsx = (type, props) => ({ type, props });
  const source = loadSource(
    "directory",
    {
      "./search": loadSource("search", {}),
      "./types": loadSource("types", {}),
      "./utils": { getAncestorsStr: () => "" },
      "@raycast/api": { List: {}, ActionPanel: {}, Action: {}, Icon: {} },
      "@raycast/utils": {
        useSQL: (_path, sql) => {
          query = sql;
          return { data: [], isLoading: false };
        },
      },
      react: { useState: () => [state.shift(), () => {}] },
      "react/jsx-runtime": { jsx, jsxs: jsx },
    },
    "tsx"
  );
  source.getListItems("SELECT Type, Title FROM Entities WHERE 1 = 1 ORDER BY RecentTime DESC", "/synthetic.db", false);
  return query;
}

test("list queries search dollar sequences literally without replacement-string expansion", async () => {
  const SQL = await require("sql.js")();
  const db = new SQL.Database();
  try {
    db.run("CREATE TABLE Entities (Type INTEGER, Title TEXT, SearchText TEXT, RecentTime INTEGER)");
    const terms = ["$&", "$$", "$'", "$`", "$100"];
    for (const [index, term] of terms.entries()) {
      db.run("INSERT INTO Entities VALUES (?, ?, ?, ?)", [1, `Synthetic ${index}`, `literal ${term} text`, index]);
    }
    for (const [index, term] of terms.entries()) {
      assert.deepEqual(db.exec(listQuery(term))[0]?.values, [[1, `Synthetic ${index}`]], term);
    }
  } finally {
    db.close();
  }
});

test("grouped browsing loads notebooks and sections before newer notes while flat browsing keeps recency order", async () => {
  const SQL = await require("sql.js")();
  const db = new SQL.Database();
  try {
    db.run("CREATE TABLE Entities (Type INTEGER, Title TEXT, SearchText TEXT, RecentTime INTEGER)");
    for (let index = 0; index < 105; index++) {
      db.run("INSERT INTO Entities VALUES (?, ?, ?, ?)", [1, `Synthetic note ${index}`, "", index + 100]);
    }
    db.run("INSERT INTO Entities VALUES (4, 'Synthetic notebook', '', 1), (2, 'Synthetic section', '', 2)");
    const grouped = db.exec(listQuery("", true))[0].values;
    assert.equal(grouped.length, 100);
    assert.deepEqual(grouped.slice(0, 2), [
      [4, "Synthetic notebook"],
      [2, "Synthetic section"],
    ]);
    const flat = db.exec(listQuery(""))[0].values;
    assert.equal(flat.length, 100);
    assert.deepEqual(flat[0], [1, "Synthetic note 104"]);
  } finally {
    db.close();
  }
});

test("timestamp columns are cast to REAL so node:sqlite does not throw for Windows FILETIME values", () => {
  // Windows FILETIME ticks (100-ns since 1601-01-01) exceed Number.MAX_SAFE_INTEGER.
  // node:sqlite (Node 22) throws RangeError for such values unless we CAST to REAL.
  let capturedSql;
  const state = [0, "", 100];
  const jsx = (type, props) => ({ type, props });
  const source = loadSource(
    "directory",
    {
      "./search": loadSource("search", {}),
      "./types": loadSource("types", {}),
      "./utils": { getAncestorsStr: () => "", getIcon: () => {}, getParentTitle: () => "", parseDatetime: () => "" },
      "@raycast/api": { List: { Item: {}, Section: {}, EmptyView: {}, Dropdown: { Section: {}, Item: {} } }, ActionPanel: {}, Action: { Push: {} }, Icon: {}, Detail: {} },
      "@raycast/utils": {
        useSQL: (_path, sql) => {
          capturedSql = sql;
          return { data: [], isLoading: false };
        },
      },
      react: { useState: () => [state.shift(), () => {}] },
      "react/jsx-runtime": { jsx, jsxs: jsx },
    },
    "tsx"
  );
  // Call Directory with no elt so it uses the full LIST_COLUMNS query
  source.Directory({ databasePath: "/synthetic.db", fullTextIndexed: false });
  assert.ok(capturedSql, "Directory must call useSQL");
  assert.ok(capturedSql.includes("CAST(LastModifiedTime AS REAL)"), "LastModifiedTime must be cast to REAL");
  assert.ok(capturedSql.includes("CAST(RecentTime AS REAL)"), "RecentTime must be cast to REAL");
  assert.ok(capturedSql.includes("CAST(PinTime AS REAL)"), "PinTime must be cast to REAL");
  // ORDER BY must use the table-qualified column so SQLite can use the index
  // rather than sorting the cast alias (which would force a full-table sort).
  assert.ok(capturedSql.includes("Entities.RecentTime DESC"), "ORDER BY must be table-qualified to use the index");
});
