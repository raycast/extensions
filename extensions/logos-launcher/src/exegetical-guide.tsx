import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, open, showHUD, showToast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { BIBLE_BOOKS, type BookMetadata } from "./data/bible-books";

type Preferences = {
  guideTitle?: string;
  referencePrefix?: string;
};

const DEFAULT_GUIDE_TITLE = "My Exegetical Guide";
const LOGOS_BUNDLE_ID = "com.logos.desktop.logos";
const DEFAULT_REFERENCE_PREFIX = "BibleESV";

export default function Command() {
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();
  const guideTitle = preferences.guideTitle?.trim() || DEFAULT_GUIDE_TITLE;
  const referencePrefix = preferences.referencePrefix?.trim() || DEFAULT_REFERENCE_PREFIX;
  const parsedReference = useMemo(
    () => parseBibleReference(trimmedQuery, referencePrefix),
    [trimmedQuery, referencePrefix],
  );
  const refParam = parsedReference?.ref;
  const referenceDisplay = parsedReference?.display ?? trimmedQuery;
  const canRun = trimmedQuery.length > 0;

  const openGuide = useCallback(async () => {
    if (!canRun) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a passage or guide title" });
      return;
    }

    const uris = buildGuideUris(guideTitle, refParam, trimmedQuery);
    let lastError: unknown;
    for (const uri of uris) {
      try {
        const isHttp = uri.startsWith("http://") || uri.startsWith("https://");
        await open(uri, isHttp ? undefined : LOGOS_BUNDLE_ID);
        await showHUD(`${guideTitle}: ${trimmedQuery}`);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Exegetical Guide",
      message: lastError instanceof Error ? lastError.message : String(lastError),
    });
  }, [canRun, guideTitle, refParam, referencePrefix, trimmedQuery]);

  return (
    <List
      searchBarPlaceholder="Type a passage (e.g., Matthew 5)"
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
    >
      {!canRun ? (
        <List.EmptyView
          icon={Icon.Text}
          title="Search Exegetical Guide"
          description="Type a Bible passage like “Matthew 5:1-12”."
        />
      ) : (
        <List.Item
          title={referenceDisplay}
          subtitle={guideTitle}
          accessoryTitle={refParam || trimmedQuery}
          icon={Icon.TextDocument}
          actions={
            <ActionPanel>
              <Action title="Open Exegetical Guide" icon={Icon.AppWindow} onAction={openGuide} />
              <Action.CopyToClipboard
                title="Copy Guide URL"
                content={buildRefLyUri(guideTitle, refParam, trimmedQuery)}
              />
              <Action.CopyToClipboard title="Copy Reference" content={refParam || trimmedQuery} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function buildGuideUris(title: string, refParam: string | undefined, query: string): string[] {
  const refLyTitle = encodeForRefLy(title);
  const encodedTitle = encodeURIComponent(title);
  const uris = new Set<string>();

  const push = (value?: string) => {
    if (value) {
      uris.add(value);
    }
  };

  if (refParam) {
    const refLyRef = encodeForRefLy(refParam);
    const encodedRef = encodeURIComponent(refParam);
    push(`https://ref.ly/logos4/Guide?t=${refLyTitle}&ref=${refLyRef}`);
    push(`logos4:Guide;t=${encodedTitle};ref=${encodedRef}`);
    push(`logos4:Guide;TemplateName=ExegeticalGuide;ref=${encodedRef}`);
    push(`logos4:ExegeticalGuide;ref=${encodedRef}`);
    push(`logos4:Guide;t=${encodedTitle};Key=${encodeURIComponent(`BibleReference|ref=${refLyRef}`)}`);
    push(`logos4:Guide;TemplateName=ExegeticalGuide;Key=${encodeURIComponent(`BibleReference|ref=${refLyRef}`)}`);
  }

  push(`https://ref.ly/logos4/Guide?t=${refLyTitle}&q=${encodeForRefLy(query)}`);
  push(`logos4:Guide;t=${encodedTitle};q=${encodeURIComponent(query)}`);
  push(`logos4:Guide;TemplateName=ExegeticalGuide;q=${encodeURIComponent(query)}`);
  push(`logos4:Guide;TemplateName=ExegeticalGuide;Key=${encodeURIComponent(query)}`);
  push(...buildCommandUris(`exegetical guide ${query}`));
  push(...buildCommandUris(`exegeticalguide ${query}`));

  return Array.from(uris);
}

function buildRefLyUri(title: string, refParam: string | undefined, query: string): string {
  const encodedTitle = encodeForRefLy(title);
  if (refParam) {
    return `https://ref.ly/logos4/Guide?t=${encodedTitle}&ref=${encodeForRefLy(refParam)}`;
  }
  return `https://ref.ly/logos4/Guide?t=${encodedTitle}&q=${encodeForRefLy(query)}`;
}

function encodeForRefLy(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

function buildCommandUris(command: string): string[] {
  const trimmed = command.trim();
  if (!trimmed) {
    return [];
  }
  const encoded = encodeURIComponent(trimmed);
  return [
    `logos4-command://command/open?text=${encoded}`,
    `logos4-command://command?text=${encoded}`,
    `logos4:Command?text=${encoded}`,
    `logos4:Command;Command=${trimmed}`,
  ];
}

type ParsedReference = {
  ref: string;
  display: string;
};

type PassagePosition = {
  chapter: number;
  verse?: number;
};

type PassageRange = {
  start?: PassagePosition;
  end?: PassagePosition;
};

const BOOK_ALIAS_PATTERNS = buildBookAliasPatterns();

function parseBibleReference(input: string, prefix?: string): ParsedReference | undefined {
  const match = matchInputToBook(input);
  if (!match) {
    return undefined;
  }

  const range = parsePassageRemainder(match.remainder);
  if (range === null) {
    return undefined;
  }

  const ref = buildBibleReference(match.book, range, prefix);
  const display = formatPassageLabel(match.book.title, range);
  return { ref, display };
}

function buildBibleReference(book: BookMetadata, range: PassageRange | undefined, prefix?: string): string {
  const base = prefix ? `${prefix}.${book.osis}` : book.osis;
  if (!range?.start) {
    return base;
  }

  const startSegment = formatPosition(range.start);
  if (!startSegment) {
    return base;
  }
  let reference = `${base}${startSegment}`;
  if (range.end) {
    const endSegment = formatEndPosition(range.end, range.start.chapter);
    if (endSegment) {
      reference += `-${endSegment}`;
    }
  }
  return reference;
}

function formatPosition(position: PassagePosition): string {
  if (position.chapter === undefined) {
    return "";
  }
  let segment = `${position.chapter}`;
  if (position.verse !== undefined) {
    segment += `.${position.verse}`;
  }
  return segment;
}

function formatEndPosition(position: PassagePosition, startChapter: number | undefined): string {
  if (position.chapter !== undefined && position.chapter !== startChapter) {
    return position.verse !== undefined ? `${position.chapter}.${position.verse}` : `${position.chapter}`;
  }
  if (position.verse !== undefined) {
    return `${position.verse}`;
  }
  if (position.chapter !== undefined) {
    return `${position.chapter}`;
  }
  return "";
}

function formatPassageLabel(title: string, range?: PassageRange): string {
  if (!range?.start) {
    return title;
  }

  let label = `${title} ${range.start.chapter}`;
  if (range.start.verse !== undefined) {
    label += `:${range.start.verse}`;
  }

  if (range.end) {
    label += "-";
    if (range.end.chapter !== undefined && range.end.chapter !== range.start.chapter) {
      label += `${range.end.chapter}`;
      if (range.end.verse !== undefined) {
        label += `:${range.end.verse}`;
      }
    } else if (range.end.verse !== undefined) {
      label += `${range.end.verse}`;
    } else if (range.end.chapter !== undefined) {
      label += `${range.end.chapter}`;
    }
  }

  return label;
}

type BookAliasPattern = {
  book: BookMetadata;
  pattern: string;
};

function buildBookAliasPatterns(): BookAliasPattern[] {
  const entries: BookAliasPattern[] = [];
  for (const book of BIBLE_BOOKS) {
    const aliases = buildAliasStrings(book);
    for (const alias of aliases) {
      const pattern = sanitizeAliasPattern(alias);
      if (pattern) {
        entries.push({ book, pattern });
      }
    }
  }
  entries.sort((a, b) => b.pattern.length - a.pattern.length);
  return entries;
}

function buildAliasStrings(metadata: BookMetadata): string[] {
  const set = new Set<string>();
  const push = (value?: string | null) => {
    if (!value) {
      return;
    }
    const normalized = value.trim();
    if (normalized) {
      set.add(normalized);
    }
  };

  push(metadata.title);
  push(metadata.lookupLabel);
  push(metadata.osis);
  push(metadata.osis.replace(/\s+/g, ""));
  metadata.abbreviations?.forEach(push);
  metadata.extraAliases?.forEach(push);

  if (metadata.ordinal && metadata.baseTitle) {
    const base = metadata.baseTitle;
    const abbreviations = metadata.baseAbbreviations ?? [];
    for (const prefix of getOrdinalPrefixes(metadata.ordinal)) {
      push(`${prefix} ${base}`);
      push(`${prefix}${base}`);
      for (const abbr of abbreviations) {
        push(`${prefix} ${abbr}`);
        push(`${prefix}${abbr}`);
      }
    }
  }

  return Array.from(set);
}

function getOrdinalPrefixes(ordinal: 1 | 2 | 3): string[] {
  switch (ordinal) {
    case 1:
      return ["1", "1st", "first", "i"];
    case 2:
      return ["2", "2nd", "second", "ii"];
    case 3:
      return ["3", "3rd", "third", "iii"];
    default:
      return [];
  }
}

function sanitizeAliasPattern(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type BookMatch = { book: BookMetadata; remainder: string };

function matchInputToBook(input: string): BookMatch | undefined {
  const normalized = input.replace(/[–—−]/g, "-").toLowerCase();
  for (const pattern of BOOK_ALIAS_PATTERNS) {
    const remainder = extractRemainder(normalized, pattern.pattern);
    if (remainder !== undefined) {
      return { book: pattern.book, remainder };
    }
  }
  return undefined;
}

function extractRemainder(input: string, pattern: string): string | undefined {
  let aliasIndex = 0;
  let inputIndex = 0;

  while (inputIndex < input.length && aliasIndex < pattern.length) {
    const char = input[inputIndex];
    if (/[a-z0-9]/.test(char)) {
      if (char !== pattern[aliasIndex]) {
        return undefined;
      }
      aliasIndex += 1;
      inputIndex += 1;
      continue;
    }
    if (/[\s.'",]/.test(char)) {
      inputIndex += 1;
      continue;
    }
    break;
  }

  if (aliasIndex < pattern.length) {
    return undefined;
  }

  while (inputIndex < input.length && /[\s.'",]/.test(input[inputIndex])) {
    inputIndex += 1;
  }

  const remainder = input
    .slice(inputIndex)
    .replace(/[\s,'"]/g, "")
    .trim();
  return remainder;
}

function parsePassageRemainder(remainder: string): PassageRange | null {
  if (!remainder) {
    return {};
  }

  if (!/^\d/.test(remainder)) {
    return null;
  }

  const normalized = remainder.replace(/[–—−]/g, "-");
  const parts = normalized.split("-");
  if (parts.length > 2) {
    return null;
  }

  const start = parsePart(parts[0]);
  if (!start) {
    return null;
  }

  let end: PassagePosition | undefined;
  if (parts.length === 2) {
    const endRaw = parts[1];
    if (endRaw.includes(":")) {
      end = parsePart(endRaw);
    } else if (start.verse !== undefined) {
      const verse = parseInt(endRaw, 10);
      if (!Number.isNaN(verse)) {
        end = { chapter: start.chapter, verse };
      }
    } else {
      const chapter = parseInt(endRaw, 10);
      if (!Number.isNaN(chapter)) {
        end = { chapter };
      }
    }
  }

  return { start, end };
}

function parsePart(input: string): PassagePosition | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  const [chapterStr, verseStr] = trimmed.split(":");
  const chapter = parseInt(chapterStr, 10);
  if (Number.isNaN(chapter)) {
    return undefined;
  }
  if (!verseStr) {
    return { chapter };
  }
  const verse = parseInt(verseStr, 10);
  if (Number.isNaN(verse)) {
    return undefined;
  }
  return { chapter, verse };
}
