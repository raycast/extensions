import { Action, ActionPanel, environment, List } from "@raycast/api";
import { readFileSync } from "fs";
import Fuse from "fuse.js";
import * as path from "path";
import { useEffect, useMemo, useState } from "react";

import initSqlJs, { Database } from "sql.js";

async function openDb() {
  const SQL = await initSqlJs({ locateFile: () => path.join(environment.assetsPath, "sql-wasm-fts5.wasm") });
  return new SQL.Database(readFileSync(path.join(environment.assetsPath, "dict.db")));
}

interface Row {
  id: number;
  word: string;
  definition: string;
  ipa_uk: string;
  ipa_us: string;
}

function search(db: Database, query: string) {
  const stmt = db.prepare(`
    select
      id, word, definition, ipa_uk, ipa_us
    from
      dictionary
    where rowid in (
      select rowid
      from dictionary_fts
      where dictionary_fts match :query
      order by rank)
    order by rowid limit 100
  `);
  stmt.bind({ ":query": `${query}*` });
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  const fuse = new Fuse(results, {
    keys: ["word"],
    findAllMatches: true,
    includeScore: true,
  })
    .search(query)
    .map(({ item }) => item);
  return [
    // Prioritize fuse results because it's good at fuzzy ranking, giving whole word results better
    // scores
    ...fuse,
    // ... but also include the rest of the SQLite FTS results
    ...results.filter((row) => !fuse.find(({ id }) => id === row.id)),
  ];
}

export default function Command() {
  const [db, setDb] = useState<Database>();
  useEffect(() => {
    openDb().then((result) => setDb(result));
    return () => db?.close();
  }, []);
  const [query, setQuery] = useState("");
  const results = useMemo(() => (db && query.trim() !== "" ? search(db, query) : []), [query, db]);
  return (
    <List isLoading={!db} onSearchTextChange={setQuery} searchBarPlaceholder="Search Ensk.is...">
      <List.EmptyView title={query.length === 0 ? "Search Word" : "No Results"} icon="no-view.png" />
      <List.Section title="Results" subtitle={results.length + ""}>
        {db && results && (results as unknown as Row[]).map((row: Row) => <SearchListItem key={row.id} row={row} />)}
      </List.Section>
    </List>
  );
}

function SearchListItem({ row }: { row: Row }) {
  return (
    <List.Item
      title={row.word}
      subtitle={row.definition}
      accessoryTitle={row.ipa_us}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={`https://ensk.is/item/${row.word}`} />
            <Action.CopyToClipboard title="Copy URL" content={`https://ensk.is/item/${row.word}`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
