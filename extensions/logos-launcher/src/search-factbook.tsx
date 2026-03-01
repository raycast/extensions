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
import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { expandTilde, pathExists } from "./utils/fs";
import { extractErrorMessage } from "./utils/errors";

const execFileAsync = promisify(execFile);

const FACTBOOK_REFERENCE_PATTERN = "bk.%";
const ENGLISH_LANGUAGE = "en";
const SQLITE_BIN = "/usr/bin/sqlite3";
const SQLITE_JSON_BUFFER = 16 * 1024 * 1024; // 16 MB buffer for sqlite3 stdout
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

type AutoCompleteInfo = {
  path: string;
  mtimeMs: number;
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

async function resolveAutoComplete(preferences: Preferences): Promise<AutoCompleteInfo> {
  const override = preferences.autocompletePath?.trim();
  if (override) {
    const fullPath = expandTilde(override);
    if (!(await pathExists(fullPath))) {
      throw new Error(`AutoComplete.db not found at ${fullPath}`);
    }
    const stats = await fs.stat(fullPath);
    return { path: fullPath, mtimeMs: stats.mtimeMs };
  }

  const baseDir = path.join(os.homedir(), "Library", "Application Support", "Logos4", "Data");
  if (!(await pathExists(baseDir))) {
    throw new Error("AutoComplete.db not found. Launch Logos once, then try again.");
  }

  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const candidates: AutoCompleteInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidate = path.join(baseDir, entry.name, "AutoComplete", "AutoComplete.db");
    if (await pathExists(candidate)) {
      const stats = await fs.stat(candidate);
      candidates.push({ path: candidate, mtimeMs: stats.mtimeMs });
    }
  }

  if (candidates.length === 0) {
    throw new Error("AutoComplete.db not found. Launch Logos once, then try again.");
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0];
}

async function queryTopics(dbPath: string, rawQuery: string): Promise<TopicRow[]> {
  const terms = getSearchTerms(rawQuery);
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
    .map((row) => ({
      reference: typeof row.reference === "string" ? row.reference : "",
      label: typeof row.label === "string" ? row.label : String(row.reference ?? ""),
      description: typeof row.description === "string" ? row.description : null,
      iconKind: typeof row.iconKind === "string" ? row.iconKind : null,
    }))
    .filter((row) => row.reference)
    .sort((a, b) => a.label.localeCompare(b.label));
}

type SqliteRow = Record<string, unknown>;

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

function getSearchTerms(rawQuery: string): string[] {
  const trimmed = rawQuery.trim();
  const seen = new Set<string>();
  const terms: string[] = [];

  const addTerm = (term: string) => {
    const normalized = term.toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    terms.push(term);
  };

  if (trimmed) {
    addTerm(trimmed);
    for (const piece of trimmed.split(/\s+/)) {
      if (piece.length >= MIN_QUERY_LENGTH) {
        addTerm(piece);
      }
    }
  }

  if (terms.length === 0 && trimmed) {
    terms.push(trimmed);
  }

  return terms;
}

async function runSqliteQuery(dbPath: string, sql: string): Promise<SqliteRow[]> {
  try {
    const { stdout } = await execFileAsync(SQLITE_BIN, ["-readonly", "-json", dbPath, sql], {
      maxBuffer: SQLITE_JSON_BUFFER,
    });
    const trimmed = stdout.trim();
    if (!trimmed) {
      return [];
    }
    return JSON.parse(trimmed) as SqliteRow[];
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & { stderr?: string };
    if (execError.code === "ENOENT") {
      throw new Error("sqlite3 binary not found. Install the macOS Command Line Tools.");
    }
    const stderr = typeof execError.stderr === "string" ? execError.stderr.trim() : undefined;
    throw new Error(stderr && stderr.length > 0 ? stderr : extractErrorMessage(error));
  }
}

function escapeSql(input: string): string {
  return input.replace(/'/g, "''");
}

// Utilities imported from ./utils/fs and ./utils/errors
