import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, open, showHUD, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractErrorMessage } from "./utils/errors";
import { LOGOS_BUNDLE_ID } from "./logos/constants";
import { encodeForRefLy } from "./utils/encodeForRefLy";
import {
  type AutoCompleteInfo,
  buildAutocompleteSearchTerms,
  escapeSql,
  normalizeAutocompleteRow,
  resolveAutoComplete,
  runSqliteQuery,
} from "./utils/autocomplete";

type Preferences = {
  autocompletePath?: string;
};

type WordSense = {
  reference: string;
  label: string;
  description?: string | null;
};

const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 75;
const ENGLISH_LANGUAGE = "en";
const WORD_STUDY_COMPLETION_KIND = 2048;
const SEARCH_SYNTAX = "syntax=v2";
const GUIDE_TITLES = ["My Bible Word Study", "Bible Word Study"];

export default function Command() {
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);
  const [dbInfo, setDbInfo] = useState<AutoCompleteInfo | undefined>();
  const [resolveError, setResolveError] = useState<string>();
  const [isResolving, setIsResolving] = useState(true);

  const [entries, setEntries] = useState<WordSense[]>([]);
  const [searchError, setSearchError] = useState<string>();
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");

  const searchTokenRef = useRef(0);

  const reloadDatabase = useCallback(async () => {
    setIsResolving(true);
    setResolveError(undefined);
    setDbInfo(undefined);
    setEntries([]);
    setSearchError(undefined);
    setIsSearching(false);
    searchTokenRef.current += 1;

    try {
      const info = await resolveAutoComplete(preferences);
      setDbInfo(info);
    } catch (error) {
      setResolveError(extractErrorMessage(error));
    } finally {
      setIsResolving(false);
    }
  }, [preferences]);

  useEffect(() => {
    reloadDatabase();
  }, [reloadDatabase]);

  useEffect(() => {
    if (!dbInfo) {
      return;
    }

    const trimmed = searchText.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setEntries([]);
      setSearchError(undefined);
      setIsSearching(false);
      return;
    }

    const token = ++searchTokenRef.current;
    setIsSearching(true);
    queryWordSenses(dbInfo.path, trimmed)
      .then((results) => {
        if (searchTokenRef.current !== token) {
          return;
        }
        setEntries(results);
        setSearchError(undefined);
      })
      .catch((error) => {
        if (searchTokenRef.current !== token) {
          return;
        }
        setEntries([]);
        setSearchError(extractErrorMessage(error));
      })
      .finally(() => {
        if (searchTokenRef.current === token) {
          setIsSearching(false);
        }
      });
  }, [dbInfo, searchText]);

  const openEntry = useCallback(async (entry: WordSense) => {
    const uris = buildWordStudyUris(entry);
    const canonicalWord = (entry.label?.trim() || entry.reference || "").trim();
    const expectedGuide = canonicalWord
      ? buildGuideRefLyUri(GUIDE_TITLES[0], canonicalWord, ENGLISH_LANGUAGE)
      : undefined;
    console.info("[WordStudy] Opening entry", {
      label: entry.label,
      reference: entry.reference,
      expectedGuide,
      uriCount: uris.length,
    });

    let lastError: unknown;

    for (const uri of uris) {
      try {
        console.info("[WordStudy] Attempting URI", uri);
        const isHttp = uri.startsWith("http://") || uri.startsWith("https://");
        await open(uri, isHttp ? undefined : LOGOS_BUNDLE_ID);
        console.info("[WordStudy] Successfully opened URI", uri);
        await showHUD(`Bible Word Study: ${entry.label}`);
        return;
      } catch (error) {
        console.error("[WordStudy] Failed URI", uri, error);
        lastError = error;
      }
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Logos",
      message: lastError ? extractErrorMessage(lastError) : "Tried multiple Logos URIs",
    });
  }, []);

  const emptyState = getEmptyState({
    resolveError,
    dbAvailable: Boolean(dbInfo),
    searchText: searchText.trim(),
    searchError,
  });

  const revealAction = dbInfo ? (
    <Action.Open title="Reveal AutoComplete DB" icon={Icon.Eye} target={dbInfo.path} application="Finder" />
  ) : undefined;

  return (
    <List
      searchBarPlaceholder="Type at least two letters (lemma, transliteration, or English word)"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      isLoading={isResolving || isSearching}
    >
      {!entries.length && !isResolving && !isSearching ? (
        <List.EmptyView
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          actions={
            <ActionPanel>
              <Action title="Reload AutoComplete" icon={Icon.ArrowClockwise} onAction={reloadDatabase} />
              {revealAction}
            </ActionPanel>
          }
        />
      ) : (
        entries.map((entry) => (
          <List.Item
            key={entry.reference}
            title={entry.label}
            subtitle={entry.description ?? undefined}
            accessoryTitle={entry.reference}
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action title="Open Bible Word Study" icon={Icon.AppWindow} onAction={() => openEntry(entry)} />
                <Action.CopyToClipboard title="Copy Word Study Command" content={buildCommandText(entry.label)} />
                <Action.CopyToClipboard title="Copy Word Sense ID" content={entry.reference} />
                <Action title="Reload AutoComplete" icon={Icon.ArrowClockwise} onAction={reloadDatabase} />
                {revealAction}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function getEmptyState(params: {
  resolveError?: string;
  dbAvailable: boolean;
  searchText: string;
  searchError?: string;
}) {
  if (params.resolveError) {
    return { title: "AutoComplete not found", description: params.resolveError, icon: Icon.ExclamationMark };
  }

  if (!params.dbAvailable) {
    return { title: "Locating AutoComplete", description: "Scanning Logos data folders…", icon: Icon.MagnifyingGlass };
  }

  if (!params.searchText) {
    return {
      title: "Search Bible Word Study",
      description: "Type at least two characters to see lemmas and senses.",
      icon: Icon.Text,
    };
  }

  if (params.searchText.length < MIN_QUERY_LENGTH) {
    return { title: "Keep typing", description: "Enter at least two characters.", icon: Icon.Text };
  }

  if (params.searchError) {
    return { title: "Search failed", description: params.searchError, icon: Icon.ExclamationMark };
  }

  return { title: "No matches", description: "Try a different spelling.", icon: Icon.Text };
}

async function queryWordSenses(dbPath: string, rawQuery: string): Promise<WordSense[]> {
  const terms = buildAutocompleteSearchTerms(rawQuery);
  if (terms.length === 0) {
    return [];
  }
  const likeClauses = terms.map((term) => `%${escapeSql(term)}%`);
  const searchConditions = likeClauses
    .map(
      (clause) => `(
    l.LabelText LIKE '${clause}' COLLATE NOCASE OR
    t.Reference LIKE '${clause}' OR
    (d.Description IS NOT NULL AND d.Description LIKE '${clause}' COLLATE NOCASE)
  )`,
    )
    .join(" OR ");

  const sql = `
WITH lang AS (
  SELECT LanguageId FROM Languages WHERE Language='${escapeSql(ENGLISH_LANGUAGE)}' LIMIT 1
)
SELECT
  t.Reference AS reference,
  COALESCE(l.LabelText, t.Reference) AS label,
  d.Description AS description
FROM Terms t
JOIN lang
LEFT JOIN Labels l ON l.TermId = t.TermId AND l.LanguageId = lang.LanguageId AND l.IsPrimary = 1
LEFT JOIN Descriptions d ON d.TermId = t.TermId AND d.LanguageId = lang.LanguageId
WHERE t.CompletionKind = ${WORD_STUDY_COMPLETION_KIND}
  AND (${searchConditions})
ORDER BY l.LabelText COLLATE NOCASE
LIMIT ${RESULT_LIMIT};
`;

  const rows = await runSqliteQuery(dbPath, sql);
  return rows
    .map(normalizeAutocompleteRow)
    .filter((row): row is WordSense => Boolean(row))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function buildWordStudyUris(entry: WordSense): string[] {
  const uris: string[] = [];
  const seen = new Set<string>();
  const add = (uri?: string) => {
    if (!uri || seen.has(uri)) {
      return;
    }
    seen.add(uri);
    uris.push(uri);
  };

  const pushRefLy = (query: string) => add(`https://ref.ly/logos4/WordStudy?${query}`);
  const pushRefLyAbsolute = (uri: string) => add(uri);
  const pushRefLySearch = (query: string) =>
    add(`https://ref.ly/logos4/Search?kind=BibleWordStudy&${SEARCH_SYNTAX}&${query}`);

  const labelRef = entry.label.trim();
  const guideWords = new Set<string>();
  if (labelRef) {
    guideWords.add(labelRef);
  }
  if (entry.reference) {
    guideWords.add(entry.reference);
  }

  for (const word of Array.from(guideWords)) {
    for (const title of GUIDE_TITLES) {
      pushRefLyAbsolute(buildGuideRefLyUri(title, word, ENGLISH_LANGUAGE));
      add(buildGuideUri(title, word, ENGLISH_LANGUAGE));
    }
  }

  if (entry.reference) {
    const refLyReference = encodeForRefLy(entry.reference);
    pushRefLy(`ref=${refLyReference}`);
    pushRefLy(`q=${refLyReference}`);
    pushRefLy(`word=${refLyReference}`);
    pushRefLySearch(`q=${refLyReference}`);
  }

  if (labelRef) {
    const refLyLabel = encodeForRefLy(labelRef);
    pushRefLy(`q=${refLyLabel}`);
    pushRefLy(`word=${refLyLabel}`);
    pushRefLySearch(`q=${refLyLabel}`);
  }

  const key = buildWordKey(entry.label);
  if (key) {
    const refLyKey = encodeForRefLy(key);
    pushRefLy(`key=${refLyKey}`);
  }

  const commands = buildCommandCandidates(entry);
  for (const command of commands) {
    const encoded = encodeURIComponent(command);
    add(`logos4-command://command/open?text=${encoded}`);
    add(`logos4-command://command?text=${encoded}`);
    add(`logos4:Command?text=${encoded}`);
    add(`logos4:Command;Command=${command}`);
  }

  if (entry.reference) {
    const encodedReference = encodeURIComponent(entry.reference);
    add(`logos4:WordStudy;q=${encodedReference}`);
    add(`logos4:WordStudy;word=${encodedReference}`);
    add(`logos4:BibleWordStudy;q=${encodedReference}`);
    add(`logos4:WordStudy;Query=${encodedReference}`);
    add(`logos4:Search;kind=BibleWordStudy;query=${encodedReference}`);
    add(`logos4:Search;kind=BibleWordStudy;q=${encodedReference}`);
  }

  if (key) {
    const encodedKey = encodeURIComponent(key);
    add(`logos4:WordStudy;key=${encodedKey}`);
    add(`logos4:Guide;TemplateName=BibleWordStudy;Key=${encodedKey}`);
    add(`logos4:Guide;Key=${encodedKey};TemplateName=BibleWordStudy`);
  }

  if (labelRef && labelRef !== entry.reference) {
    const encodedLabel = encodeURIComponent(labelRef);
    add(`logos4:WordStudy;q=${encodedLabel}`);
    add(`logos4:WordStudy;word=${encodedLabel}`);
    add(`logos4:Search;kind=BibleWordStudy;query=${encodedLabel}`);
  }

  return uris;
}

function buildGuideUri(title: string, word: string, language: string) {
  const encodedTitle = encodeURIComponent(title);
  const encodedWord = encodeURIComponent(word);
  const encodedLang = encodeURIComponent(language);
  return `logos4:Guide;t=${encodedTitle};hw=${encodedWord};lang=${encodedLang}`;
}

function buildGuideRefLyUri(title: string, word: string, language: string) {
  const encodedTitle = encodeForRefLy(title);
  const encodedWord = encodeForRefLy(word);
  const encodedLang = encodeForRefLy(language);
  return `https://ref.ly/logos4/Guide?t=${encodedTitle}&hw=${encodedWord}&lang=${encodedLang}`;
}

function buildCommandCandidates(entry: WordSense): string[] {
  const commands = new Set<string>();
  const trimmedLabel = entry.label.trim();
  if (trimmedLabel) {
    commands.add(`bws ${trimmedLabel}`);
  }
  if (entry.reference && entry.reference !== trimmedLabel) {
    commands.add(`bws ${entry.reference}`);
  }
  return Array.from(commands);
}

function buildCommandText(label: string) {
  const trimmed = label.trim();
  return trimmed ? `bws ${trimmed}` : "bws";
}

function buildWordKey(label: string) {
  const trimmed = label.trim();
  if (!trimmed) {
    return undefined;
  }
  return `Word|language=en|word=${trimmed}`;
}
