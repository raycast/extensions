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
