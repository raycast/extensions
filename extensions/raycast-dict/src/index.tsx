import { ActionPanel, Action, List, Icon, LaunchProps } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { define, complete, DictResult } from "./dict-helper";
import { htmlToMarkdown, htmlToBrief, htmlExtractRefs } from "./html-to-md";

interface WordEntry {
  word: string;
  definitions: DictResult[];
}

export default function Command(props: LaunchProps) {
  const initialWord = props.fallbackText?.trim() || "";
  const [searchText, setSearchText] = useState(initialWord);
  const [entries, setEntries] = useState<WordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const defCacheRef = useRef<Map<string, DictResult[]>>(new Map());

  // Search: define the typed word + get completions in parallel
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (!searchText.trim()) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const signal = abortRef.current.signal;

    (async () => {
      try {
        const [defResults, completions] = await Promise.all([
          define([searchText]),
          complete(searchText),
        ]);
        if (signal.aborted) return;

        if (defResults.length > 0) {
          defCacheRef.current.set(searchText.toLowerCase(), defResults);
        }

        const normalize = (s: string) =>
          s
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const searchNorm = normalize(searchText);
        const suggestions = completions.filter(
          (c) => normalize(c) !== searchNorm,
        );

        const result: WordEntry[] = [];
        result.push({ word: searchText, definitions: defResults });
        for (const comp of suggestions) {
          const cached = defCacheRef.current.get(comp.toLowerCase());
          result.push({ word: comp, definitions: cached || [] });
        }
        setEntries(result);

        // Eagerly load definitions for the first 3 suggestions
        const toLoad = suggestions
          .slice(0, 3)
          .filter((w) => !defCacheRef.current.has(w.toLowerCase()));
        if (toLoad.length > 0) {
          const moreDefs = await define(toLoad);
          if (signal.aborted) return;

          const byWord = new Map<string, DictResult[]>();
          for (const def of moreDefs) {
            const key = def.word.toLowerCase();
            if (!byWord.has(key)) byWord.set(key, []);
            byWord.get(key)!.push(def);
          }
          for (const [key, defs] of byWord) {
            defCacheRef.current.set(key, defs);
          }

          setEntries((prev) =>
            prev.map((e) => {
              const defs = byWord.get(e.word.toLowerCase());
              return defs ? { ...e, definitions: defs } : e;
            }),
          );
        }
      } catch {
        // Ignore abort errors
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    })();

    return () => abortRef.current?.abort();
  }, [searchText]);

  // Lazy-load definitions when navigating to an item without them
  const handleSelectionChange = (id: string | null) => {
    if (!id) return;
    const entry = entries.find((e) => e.word === id);
    if (!entry || entry.definitions.length > 0) return;

    define([entry.word]).then((defs) => {
      if (defs.length === 0) return;
      defCacheRef.current.set(entry.word.toLowerCase(), defs);
      setEntries((prev) =>
        prev.map((e) =>
          e.word === entry.word ? { ...e, definitions: defs } : e,
        ),
      );
    });
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={handleSelectionChange}
      searchBarPlaceholder="Look up a word..."
      isShowingDetail={entries.length > 0}
      throttle
    >
      {entries.map((entry) => {
        const hasDefs = entry.definitions.length > 0;
        const refs = hasDefs
          ? entry.definitions
              .flatMap((d) => htmlExtractRefs(d.definition))
              .filter(
                (r, i, a) =>
                  a.findIndex((x) => x.toLowerCase() === r.toLowerCase()) === i,
              )
          : [];
        return (
          <List.Item
            id={entry.word}
            key={entry.word}
            title={entry.word}
            subtitle={
              hasDefs ? htmlToBrief(entry.definitions[0].definition) : ""
            }
            detail={
              <List.Item.Detail markdown={hasDefs ? formatDetail(entry) : ""} />
            }
            actions={
              <ActionPanel>
                {hasDefs ? (
                  <>
                    <Action.CopyToClipboard
                      title="Copy Definition"
                      content={entry.definitions
                        .map((d) => d.definition)
                        .join("\n\n")}
                    />
                    <Action.OpenInBrowser
                      title="Open in Dictionary"
                      url={`dict://${encodeURIComponent(entry.word)}`}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Word"
                      content={entry.word}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    {refs.map((ref) => (
                      <Action
                        key={ref}
                        title={`Look Up "${ref}"`}
                        icon={Icon.ArrowRight}
                        onAction={() => setSearchText(ref)}
                      />
                    ))}
                  </>
                ) : (
                  <Action
                    title="Look up"
                    icon={Icon.Book}
                    onAction={() => setSearchText(entry.word)}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function formatDetail(entry: WordEntry): string {
  return entry.definitions
    .map((d) => `*${d.dict}*\n\n---\n\n` + htmlToMarkdown(d.definition))
    .join("\n\n---\n\n");
}
