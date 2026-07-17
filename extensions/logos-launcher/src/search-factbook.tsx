import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractErrorMessage } from "./utils/errors";
import {
  type AutoCompleteInfo,
  buildAutocompleteSearchTerms,
  escapeSql,
  normalizeAutocompleteRow,
  resolveAutoComplete,
  runSqliteQuery,
} from "./utils/autocomplete";

const FACTBOOK_REFERENCE_PATTERN = "bk.%";
const ENGLISH_LANGUAGE = "en";
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 75;

const ICON_BY_KIND: Record<string, Icon> = {
  SupernaturalBeing: Icon.Star,
  PeopleGroup: Icon.Person,
  Man: Icon.Person,
  Woman: Icon.Person,
  City: Icon.Building,
  OtherPlace: Icon.Globe,
  NaturalPlace: Icon.Mountain,
  ManMadePlace: Icon.House,
  ClassOfThing: Icon.List,
  Thing: Icon.Circle,
  Event: Icon.Calendar,
  PreachingTheme: Icon.Book,
  Topic: Icon.TextDocument,
  WordSense: Icon.Paragraph,
  Culture: Icon.Globe,
};

type Preferences = {
  autocompletePath?: string;
};

type TopicRow = {
  reference: string;
  label: string;
  description?: string | null;
  iconKind?: string | null;
};

export default function Command() {
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);
  const [dbInfo, setDbInfo] = useState<AutoCompleteInfo | undefined>();
  const [resolveError, setResolveError] = useState<string>();
  const [isResolving, setIsResolving] = useState(true);

  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [searchError, setSearchError] = useState<string>();
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");

  const searchTokenRef = useRef(0);

  const reloadDatabase = useCallback(async () => {
    setIsResolving(true);
    setResolveError(undefined);
    setDbInfo(undefined);
    setTopics([]);
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

    const query = searchText.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setTopics([]);
      setSearchError(undefined);
      setIsSearching(false);
      return;
    }

    const token = ++searchTokenRef.current;
    setIsSearching(true);
    queryTopics(dbInfo.path, query)
      .then((results) => {
        if (searchTokenRef.current !== token) {
          return;
        }
        setTopics(results);
        setSearchError(undefined);
      })
      .catch((error) => {
        if (searchTokenRef.current !== token) {
          return;
        }
        setTopics([]);
        setSearchError(extractErrorMessage(error));
      })
      .finally(() => {
        if (searchTokenRef.current === token) {
          setIsSearching(false);
        }
      });
  }, [dbInfo, searchText]);

  const openTopic = useCallback(async (reference: string, label: string) => {
    const uri = buildFactbookUri(reference);
    try {
      await open(uri);
      await showHUD(`Opening ${label}`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open Factbook",
        message: `${extractErrorMessage(error)} — URI: ${uri}`,
      });
    }
  }, []);

  const copyUri = useCallback(async (reference: string) => Clipboard.copy(buildFactbookUri(reference)), []);

  const listIsLoading = isResolving || isSearching;
  const hasResults = topics.length > 0;

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
      isLoading={listIsLoading}
      searchBarPlaceholder="Type a topic (min 2 letters)"
      throttle
      onSearchTextChange={setSearchText}
    >
      {!hasResults && !listIsLoading ? (
        <List.EmptyView
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          actions={
            <ActionPanel>
              <Action title="Reload Database" icon={Icon.ArrowClockwise} onAction={reloadDatabase} />
              {revealAction}
            </ActionPanel>
          }
        />
      ) : (
        topics.map((topic) => (
          <List.Item
            key={topic.reference}
            title={topic.label}
            subtitle={topic.description ?? undefined}
            accessoryTitle={topic.reference}
            icon={topic.iconKind && ICON_BY_KIND[topic.iconKind] ? ICON_BY_KIND[topic.iconKind] : Icon.Book}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Factbook"
                  icon={Icon.AppWindow}
                  onAction={() => openTopic(topic.reference, topic.label)}
                />
                <Action title="Copy Factbook URI" icon={Icon.Clipboard} onAction={() => copyUri(topic.reference)} />
                <Action title="Reload Database" icon={Icon.ArrowClockwise} onAction={reloadDatabase} />
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
}): { title: string; description?: string; icon: Icon } {
  if (params.resolveError) {
    return { title: "AutoComplete not found", description: params.resolveError, icon: Icon.ExclamationMark };
  }

  if (!params.dbAvailable) {
    return {
      title: "Locating AutoComplete",
      description: "Searching your Logos data folder…",
      icon: Icon.MagnifyingGlass,
    };
  }

  if (!params.searchText) {
    return {
      title: "Search Factbook",
      description: "Type at least two characters to query Factbook topics.",
      icon: Icon.TextDocument,
    };
  }

  if (params.searchText.length < MIN_QUERY_LENGTH) {
    return { title: "Keep typing", description: "Enter at least two characters.", icon: Icon.TextDocument };
  }

  if (params.searchError) {
    return { title: "Search failed", description: params.searchError, icon: Icon.ExclamationMark };
  }

  return { title: "No results", description: "Try a different spelling or topic.", icon: Icon.TextDocument };
}

async function queryTopics(dbPath: string, rawQuery: string): Promise<TopicRow[]> {
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
  d.Description AS description,
  k.IconKind AS iconKind
FROM Terms t
JOIN lang
LEFT JOIN Labels l ON l.TermId = t.TermId AND l.LanguageId = lang.LanguageId AND l.IsPrimary = 1
LEFT JOIN Descriptions d ON d.TermId = t.TermId AND d.LanguageId = lang.LanguageId
LEFT JOIN IconKinds k ON k.IconKindId = t.IconKindId
WHERE t.Reference LIKE '${FACTBOOK_REFERENCE_PATTERN}'
  AND (${searchConditions})
ORDER BY l.LabelText COLLATE NOCASE
LIMIT ${RESULT_LIMIT};
`;

  const rows = await runSqliteQuery(dbPath, sql);
  return rows
    .map(normalizeAutocompleteRow)
    .filter((row): row is TopicRow => Boolean(row))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function buildFactbookUri(reference: string): string {
  const normalized = normalizeFactbookReference(reference);
  if (!normalized) {
    return "https://ref.ly/logos4/Factbook";
  }
  const idParam = encodeURIComponent(normalized);
  return `https://ref.ly/logos4/Factbook?id=${idParam}&lens=all`;
}

function normalizeFactbookReference(reference: string): string {
  const trimmed = reference.trim();
  if (!trimmed) {
    return "";
  }

  const candidate = extractReferenceCandidate(trimmed);
  const decoded = decodeReference(candidate);
  if (decoded.toLowerCase().startsWith("ref:")) {
    return decoded;
  }
  return `ref:${decoded}`;
}

function extractReferenceCandidate(input: string): string {
  const refMatch = input.match(/ref=([^;&]+)/i);
  if (refMatch?.[1]) {
    return refMatch[1];
  }

  const idMatch = input.match(/[?&]id=([^&]+)/i);
  if (idMatch?.[1]) {
    return idMatch[1];
  }

  return input;
}

function decodeReference(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}
