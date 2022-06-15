import { Action, ActionPanel, List, environment } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { readFileSync } from "fs";
import * as path from "path";

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
  return results;
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
            <Action.OpenInBrowser title="Open in Browser" url={`https://ensk.is/item/${row.word}`} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy URL" content={`https://ensk.is/item/${row.word}`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
