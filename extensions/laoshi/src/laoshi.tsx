import { ActionPanel, List, Action, Icon, environment } from "@raycast/api";
import * as fs from "fs";
import path from "path";
import { useMemo, useState } from "react";
import { useLocalStorage } from "@raycast/utils";

const csvData = fs.readFileSync(path.join(environment.assetsPath, "output.csv"), "utf-8");
const lines = csvData.split("\n").filter(Boolean);
const MAX_VISIBLE_ITEMS = 500;

type Entry = {
  hanzi: string;
  pinyin: string;
  meaning: string;
};

type SavedWord = {
  id: string;
  title: string;
  meaning: string;
};

function parseLine(line: string): Entry | null {
  const firstComma = line.indexOf(",");
  if (firstComma === -1) return null;

  const secondComma = line.indexOf(",", firstComma + 1);
  if (secondComma === -1) return null;

  return {
    hanzi: line.slice(0, firstComma).trim(),
    pinyin: line.slice(firstComma + 1, secondComma).trim(),
    meaning: line.slice(secondComma + 1).trim(),
  };
}

function normalizePinyin(text: string, keepNumbers: boolean): string {
  let normalized = text.toLowerCase().replace(/\[|\]/g, "").replace(/\s+/g, "").trim();

  if (!keepNumbers) {
    normalized = normalized.replace(/\d+/g, "");
  }

  return normalized;
}

const entries: Entry[] = lines
  .slice(1)
  .map(parseLine)
  .filter((entry): entry is Entry => entry !== null);

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const rawQuery = searchText.trim().toLowerCase();
  const meaningMode = rawQuery.startsWith("m:");
  const meaningQuery = meaningMode ? rawQuery.slice(2).trim() : "";
  const query = meaningMode ? "" : rawQuery;

  const visibleEntries = useMemo(() => {
    if (meaningMode) {
      if (meaningQuery === "") {
        return entries.slice(0, MAX_VISIBLE_ITEMS);
      }

      return entries.filter((entry) => entry.meaning.toLowerCase().includes(meaningQuery)).slice(0, MAX_VISIBLE_ITEMS);
    }

    if (query === "") {
      return entries.slice(0, MAX_VISIBLE_ITEMS);
    }

    const pinyinMatches: Array<{
      entry: Entry;
      lengthDelta: number;
      startsWithQuery: boolean;
    }> = [];
    const otherMatches: Entry[] = [];
    const queryHasNumber = /\d/.test(query);
    const normalizedQueryPinyin = normalizePinyin(query, queryHasNumber);

    for (const entry of entries) {
      const normalizedEntryPinyin = normalizePinyin(entry.pinyin, queryHasNumber);
      const hasPinyinMatch = normalizedQueryPinyin.length > 0 && normalizedEntryPinyin.includes(normalizedQueryPinyin);

      if (hasPinyinMatch) {
        pinyinMatches.push({
          entry,
          lengthDelta: Math.abs(normalizedEntryPinyin.length - normalizedQueryPinyin.length),
          startsWithQuery: normalizedEntryPinyin.startsWith(normalizedQueryPinyin),
        });
      } else {
        const hasOtherMatch = entry.hanzi.toLowerCase().includes(query);

        if (hasOtherMatch) {
          otherMatches.push(entry);
        }
      }
    }

    pinyinMatches.sort((a, b) => {
      const aExact = a.lengthDelta === 0 ? 0 : 1;
      const bExact = b.lengthDelta === 0 ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;

      if (a.lengthDelta !== b.lengthDelta) return a.lengthDelta - b.lengthDelta;
      if (a.startsWithQuery !== b.startsWithQuery) return a.startsWithQuery ? -1 : 1;
      return 0;
    });

    return [...pinyinMatches.map((match) => match.entry), ...otherMatches].slice(0, MAX_VISIBLE_ITEMS);
  }, [meaningMode, meaningQuery, query]);

  const { value: savedWords = [], setValue: setSavedWords } = useLocalStorage<SavedWord[]>("saved_words", []);

  const saveWord = async (entry: Entry) => {
    const id = `${entry.hanzi}|${entry.pinyin}|${entry.meaning}`;
    const exists = savedWords.some((word) => word.id === id);
    if (exists) return;

    await setSavedWords([
      ...savedWords,
      {
        id,
        title: entry.pinyin,
        meaning: entry.meaning,
      },
    ]);
  };

  return (
    <List
      searchBarPlaceholder="Search hanzi/pinyin (or use m: for meaning)"
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={false}
    >
      {visibleEntries.map((entry, index) => {
        return (
          <List.Item
            key={index}
            icon={Icon.XMarkCircle}
            title={entry.hanzi}
            subtitle={entry.pinyin}
            accessories={[{ text: entry.meaning }]}
            actions={
              <ActionPanel>
                <Action title="Save Word" onAction={() => saveWord(entry)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
