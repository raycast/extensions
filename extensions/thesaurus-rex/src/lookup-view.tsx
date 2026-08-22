import { Action, ActionPanel, Icon, List, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { downloadWithToast } from "./download";
import type { Entry } from "./offline";
import {
  hasOfflineData,
  offlinePronunciation,
  offlineAntonyms,
  offlineDefinitions,
  offlineSynonyms,
  SOURCES,
  TOTAL_BYTES,
} from "./offline";

export type Kind = "synonyms" | "antonyms" | "definitions";

type Definition = Entry & { pos: string; examples: string[] };

type Results = {
  synonyms: Entry[];
  antonyms: Entry[];
  definitions: Definition[];
};

const EMPTY: Results = { synonyms: [], antonyms: [], definitions: [] };

const isDefinition = (entry: Entry | Definition): entry is Definition =>
  "pos" in entry;

const POS_NAMES: Record<string, string> = {
  n: "noun",
  v: "verb",
  a: "adjective",
  s: "adjective",
  r: "adverb",
};

const collapsedLimit = (kinds: Kind[]) => (kinds.length > 1 ? 3 : 25);

// ponytail: lookups are local and sub-ms; this only skips work mid-word.
const DEBOUNCE_MS = 120;

export default function LookupView({ kinds }: { kinds: Kind[] }) {
  const dir = environment.supportPath;
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [expanded, setExpanded] = useState<Kind[]>([]);
  const [showingDetail, setShowingDetail] = useState(false);
  const [hasData, setHasData] = useState(() => hasOfflineData(dir));
  const [downloading, setDownloading] = useState(false);

  useEffect(() => setExpanded([]), [query]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // a literal prop is a new array every render, so join it for the deps
  const wanted = kinds.join(",");

  useEffect(() => {
    // per search, not per render: Manage Dictionaries may have installed them since
    const installed = hasData || hasOfflineData(dir);
    if (installed !== hasData) setHasData(installed);
    if (!installed) return;
    setResults({
      synonyms: kinds.includes("synonyms") ? offlineSynonyms(search, dir) : [],
      antonyms: kinds.includes("antonyms") ? offlineAntonyms(search, dir) : [],
      definitions: kinds.includes("definitions")
        ? offlineDefinitions(search, dir)
        : [],
    });
  }, [search, hasData, wanted]);

  const actions = (word: string) => (
    <ActionPanel>
      <Action.CopyToClipboard icon={Icon.Clipboard} content={word} />
      <Action.Paste icon={Icon.TextCursor} content={word} />
      <Action
        title="Toggle Details"
        icon={Icon.Sidebar}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "d" },
          Windows: { modifiers: ["ctrl"], key: "d" },
        }}
        onAction={() => setShowingDetail((shown) => !shown)}
      />
    </ActionPanel>
  );

  const limit = collapsedLimit(kinds);

  const section = (
    kind: Kind,
    title: string,
    entries: (Entry | Definition)[],
  ) => {
    if (entries.length === 0) return null;
    const isExpanded = expanded.includes(kind);
    const shown = isExpanded ? entries : entries.slice(0, limit);
    const hidden = entries.length - shown.length;
    return (
      <List.Section title={title} subtitle={`${entries.length}`}>
        {shown.map((entry, position) => {
          const definition = isDefinition(entry) ? entry : undefined;
          return (
            <List.Item
              key={`${kind}-${position}-${entry.value}`}
              title={entry.value}
              accessories={
                showingDetail
                  ? undefined
                  : [
                      ...(definition?.pos
                        ? [
                            {
                              tag: POS_NAMES[definition.pos] ?? definition.pos,
                            },
                          ]
                        : []),
                      { text: SOURCES[entry.source] },
                    ]
              }
              detail={
                <List.Item.Detail
                  markdown={detailMarkdown(search, entry, definition)}
                />
              }
              actions={actions(entry.value)}
            />
          );
        })}
        {hidden > 0 && (
          <List.Item
            key={`${kind}-more`}
            icon={Icon.Ellipsis}
            title={`Show ${hidden} more`}
            detail={<List.Item.Detail markdown={`${hidden} more results`} />}
            actions={
              <ActionPanel>
                <Action
                  title={`Show ${hidden} More`}
                  icon={Icon.Ellipsis}
                  onAction={() => setExpanded([...expanded, kind])}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    );
  };

  const empty =
    results.synonyms.length +
      results.antonyms.length +
      results.definitions.length ===
    0;

  return (
    <List
      isLoading={downloading}
      isShowingDetail={showingDetail && !empty}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={`Search ${kinds.join(", ")}…`}
    >
      {empty && (
        <List.EmptyView
          icon={hasData ? Icon.MagnifyingGlass : Icon.Download}
          title={
            !hasData
              ? "One download and you're set"
              : search.trim()
                ? "Nothing found"
                : "Type a word to look it up"
          }
          description={
            !hasData
              ? `Everything runs on this Mac, so the dictionaries have to come here first.\n\n${(TOTAL_BYTES / 1_000_000).toFixed(1)} MB, deletable any time from Manage Dictionaries.`
              : undefined
          }
          // download only: deleting stays behind its own command, out of ⏎'s reach
          actions={
            !hasData ? (
              <ActionPanel>
                <Action
                  title="Download Dictionaries"
                  icon={Icon.Download}
                  onAction={async () => {
                    setDownloading(true);
                    setHasData(await downloadWithToast(dir));
                    setDownloading(false);
                  }}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      )}

      {section("definitions", "Definitions", results.definitions)}
      {section("synonyms", "Synonyms", results.synonyms)}
      {section("antonyms", "Antonyms", results.antonyms)}
    </List>
  );
}

const escapeMarkdown = (text: string) =>
  text.replace(/[\\`*_[\]()<>#!|~]/g, "\\$&");

function detailMarkdown(
  query: string,
  entry: Entry,
  definition: Definition | undefined,
): string {
  const lines: string[] = [];
  const dir = environment.supportPath;
  if (definition) {
    const word = query.trim() || entry.value;
    const ipa = offlinePronunciation(word, dir);
    // the search bar can be filled from another app's selection, so the query is
    // not always something the user typed: it renders as text, never as markdown
    lines.push(`## ${escapeMarkdown(word)}${ipa ? `  |${ipa}|` : ""}`);
    lines.push(`*${POS_NAMES[definition.pos] ?? definition.pos}*`);
    lines.push("");
    lines.push(entry.value);
    for (const example of definition.examples) lines.push(`\n> ${example}`);
  } else {
    const ipa = offlinePronunciation(entry.value, dir);
    lines.push(`## ${entry.value}${ipa ? `  |${ipa}|` : ""}`);
    const senses = offlineDefinitions(entry.value, dir);
    if (senses.length === 0)
      lines.push("\n*No definition in the dictionaries.*");
    for (const sense of senses.slice(0, 5)) {
      lines.push(`\n**${POS_NAMES[sense.pos] ?? sense.pos}** ${sense.value}`);
      if (sense.examples[0]) lines.push(`\n> ${sense.examples[0]}`);
    }
  }
  lines.push(`\n---\n${SOURCES[entry.source]}`);
  return lines.join("\n");
}
