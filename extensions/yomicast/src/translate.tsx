import fs from "node:fs";
import { DB_PATH, SQLITE_WASM_PATH } from "./constants";
import { useEffect, useMemo, useState } from "react";
import initSqlJs, { Database } from "sql.js";
import { Action, ActionPanel, launchCommand, LaunchType, List } from "@raycast/api";
import { normalizeKana } from "./utils";
import { isJapanese, isKana } from "wanakana";
import { searchEnglish, searchKana, searchKanji } from "./dictionary/search";
import { JMdictSense, JMdictWord } from "@scriptin/jmdict-simplified-types";
import dedent from "ts-dedent";

type SenseWithExamples = JMdictSense & {
  examples?: {
    source: { type: string; value: string };
    text: string;
    sentences: { land: "jpn" | "eng"; text: string }[];
  }[];
};

type FormattedKanjiItem = {
  id: string;
  kana: string;
  kanji?: string;
  definition?: string;
  detail: string;
};

function isDbSetup() {
  return fs.existsSync(DB_PATH);
}

let db: Database | undefined;
async function getDb() {
  if (db) return db;

  // Start promises in parallel
  const readWasm = fs.promises.readFile(SQLITE_WASM_PATH);
  const readDb = fs.promises.readFile(DB_PATH);

  const SQL = await initSqlJs({ wasmBinary: await readWasm });
  db = new SQL.Database(await readDb);
  return db;
}

function search(db: Database, query: string) {
  const japaneseQuery = normalizeKana(query);
  if (!isJapanese(japaneseQuery)) {
    return searchEnglish(db, query);
  }

  if (isKana(japaneseQuery)) {
    return searchKana(db, japaneseQuery);
  }

  return searchKanji(db, japaneseQuery);
}

function formatKanjiItem(item: JMdictWord, db: Database): FormattedKanjiItem {
  const kanji = item.kanji.at(0)?.text;
  const kana = item.kana.at(0)?.text || "No kana";
  const definition = item.sense.at(0)?.gloss.at(0)?.text;

  let glossCount = 0;
  const formatGlosses = (sense: SenseWithExamples) => {
    const formattedGlosses = [];
    for (const gloss of sense.gloss) {
      glossCount += 1;
      formattedGlosses.push(`${glossCount}. ${gloss.text}`);
    }

    const example = sense.examples?.at(0)?.sentences.map(({ land, text }) => ({ land, text }));
    return dedent`
      ${formattedGlosses.join("\n")}
        > ${example?.find((s) => s.land === "jpn")?.text || ""}
        >
        > ${example?.find((s) => s.land === "eng")?.text || ""}
    `;
  };

  const formatSense = (sense: JMdictSense) => {
    const pos = sense.partOfSpeech.map((pos) => simplifyPartOfSpeech(pos, db)).join(", ");

    return dedent`
      ##### ${pos}
      ${formatGlosses(sense)}
    `;
  };

  const sensesMarkdown = item.sense.map(formatSense).join("\n\n");

  const detail = dedent`
    ## ${kanji || kana}
    ${kanji ? kana : ""}

    ${sensesMarkdown}
  `;

  return {
    id: item.id,
    kanji,
    kana,
    definition,
    detail,
  };
}

function simplifyPartOfSpeech(pos: string, db: Database) {
  const getPosMap = db.exec("SELECT value from metadata WHERE key = ? LIMIT 1", ["tags"]);
  const posMap = JSON.parse((getPosMap.at(0)?.values.at(0)?.at(0) as string) ?? "{}");

  // Override values where the database's are too verbose
  switch (pos) {
    case "n":
      return "Noun";
  }

  return posMap[pos];
}

export default function Command() {
  const [isSetup] = useState(isDbSetup);
  if (!isSetup) {
    return (
      <List>
        <List.EmptyView
          title="Dictionary not set up"
          description='Press "Return" to set up the dictionary.'
          actions={
            <ActionPanel>
              <Action
                title="Update Dictionary"
                onAction={() => {
                  launchCommand({ name: "update-dictionary", type: LaunchType.UserInitiated });
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const [db, setDb] = useState<Database>();
  const [query, setQuery] = useState("");
  const [showingDetail, setShowingDetail] = useState(false);

  useEffect(() => {
    getDb().then((db) => setDb(db));
    return () => db?.close();
  }, []);

  const results = useMemo(() => {
    if (!db || query.trim() === "") return [];
    const res = search(db, query);
    return res;
  }, [db, query]);

  const formattedData = db ? results.map((item) => formatKanjiItem(item, db)) : [];

  return (
    <List
      navigationTitle="Translate Japanese"
      searchBarPlaceholder="Search Yomicast..."
      searchText={query}
      onSearchTextChange={setQuery}
      isShowingDetail={showingDetail}
    >
      {formattedData.map((item) => (
        <List.Item
          key={item.id}
          title={item.kanji ?? item.kana}
          subtitle={item.kanji && !showingDetail ? item.kana : undefined}
          accessories={[{ text: item.definition }]}
          detail={<List.Item.Detail markdown={item.detail} />}
          actions={
            <ActionPanel>
              <Action title="Toggle Detail" onAction={() => setShowingDetail(!showingDetail)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
