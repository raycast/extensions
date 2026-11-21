import React, { useState, useEffect, useMemo } from 'react';
import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  useNavigation,
} from '@raycast/api';
import {
  RogetClass,
  RogetEntry,
  RogetSection,
  getRogetClasses,
  getRogetClass,
  getRogetSection,
  getRogetEntry,
  searchRoget,
  formatRogetMarkdown,
  extractCrossReferences,
  parseRogetEntryWords,
} from './services/roget-service';
import { buildGridRows, getNextGridIndex } from './utils/ui-helpers';
import DefCommand from './def';
import SynonymsCommand from './synonyms';

export type RogetProps = {
  arguments?: { query?: string; entryId?: number };
  launchType?: any;
  initialQuery?: string;
  fallbackText?: string;
  launchContext?: { query?: string; entryId?: number; [key: string]: any };
};

const NUMBER_ICONS: Record<number, any> = {
  1: Icon.Number01,
  2: Icon.Number02,
  3: Icon.Number03,
  4: Icon.Number04,
  5: Icon.Number05,
  6: Icon.Number06,
  7: Icon.Number07,
  8: Icon.Number08,
  9: Icon.Number09,
};

/**
 * 1. Clean Full-Width Detail View for Roget's Thesaurus Category (Right column removed)
 * Supports cycling between consecutive entries via:
 * - Left/Right arrow keys (← and →)
 * - Clicking the word title or navigation links
 * - ActionPanel primary actions
 */
export function RogetEntryDetailView({
  entryId: initialEntryId,
  onBack,
}: {
  entryId: number;
  onBack?: () => void;
}) {
  const [currentId, setCurrentId] = useState(initialEntryId);
  const [selectedWordIndex, setSelectedWordIndex] = useState(0);

  useEffect(() => {
    setCurrentId(initialEntryId);
    setSelectedWordIndex(0);
  }, [initialEntryId]);

  const entry = getRogetEntry(currentId);

  if (!entry) {
    return (
      <Detail
        markdown={`# Category ${currentId} Not Found\n\nRoget's Thesaurus contains 1,000 categories (1 to 1000).`}
      />
    );
  }

  const crossRefs = extractCrossReferences(entry);
  const prevId = currentId > 1 ? currentId - 1 : 1000;
  const nextId = currentId < 1000 ? currentId + 1 : 1;
  const prevEntry = getRogetEntry(prevId);
  const nextEntry = getRogetEntry(nextId);

  const wordSections = useMemo(() => parseRogetEntryWords(entry), [entry]);
  const { allWords, rows } = useMemo(
    () => buildGridRows(wordSections.map((s) => s.words), 5),
    [wordSections]
  );

  const selectedWord =
    allWords.length > 0 ? allWords[selectedWordIndex] || allWords[0] : entry.title;

  const handleNextWord = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'right', allWords.length));
  const handlePrevWord = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'left', allWords.length));
  const handleDownLine = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'down', allWords.length));
  const handleUpLine = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'up', allWords.length));

  const handleNext = () => {
    setCurrentId(nextId);
    setSelectedWordIndex(0);
  };

  const handlePrev = () => {
    setCurrentId(prevId);
    setSelectedWordIndex(0);
  };

  return (
    <Detail
      isLoading={false}
      navigationTitle={`${entry.id}. ${entry.title.toUpperCase()} · ${entry.classLabel}`}
      markdown={formatRogetMarkdown(entry, selectedWord)}
      actions={
        <ActionPanel>
          <Action.Push
            title={`Define "${selectedWord}" in def`}
            icon={Icon.Book}
            target={<DefCommand initialQuery={selectedWord} />}
          />
          {allWords.length > 1 && (
            <>
              <Action
                title="Next Word (Right Arrow)"
                icon={Icon.ArrowRight}
                onAction={handleNextWord}
                shortcut={{ modifiers: [], key: 'arrowRight' }}
              />
              <Action
                title="Previous Word (Left Arrow)"
                icon={Icon.ArrowLeft}
                onAction={handlePrevWord}
                shortcut={{ modifiers: [], key: 'arrowLeft' }}
              />
              <Action
                title="Down Line (Down Arrow)"
                icon={Icon.ArrowDown}
                onAction={handleDownLine}
                shortcut={{ modifiers: [], key: 'arrowDown' }}
              />
              <Action
                title="Up Line (Up Arrow)"
                icon={Icon.ArrowUp}
                onAction={handleUpLine}
                shortcut={{ modifiers: [], key: 'arrowUp' }}
              />
            </>
          )}
          <ActionPanel.Section title="Consecutive Entries Navigation">
            {nextEntry && (
              <Action
                title={`Next: ${nextEntry.id}. ${nextEntry.title} (])`}
                icon={Icon.ArrowRight}
                onAction={handleNext}
                shortcut={{ modifiers: [], key: ']' }}
              />
            )}
            {prevEntry && (
              <Action
                title={`Previous: ${prevEntry.id}. ${prevEntry.title} ([)`}
                icon={Icon.ArrowLeft}
                onAction={handlePrev}
                shortcut={{ modifiers: [], key: '[' }}
              />
            )}
            {nextEntry && (
              <Action
                title="Next Entry (Cmd+Right)"
                icon={Icon.ArrowRight}
                onAction={handleNext}
                shortcut={{ modifiers: ['cmd'], key: 'arrowRight' }}
              />
            )}
            {prevEntry && (
              <Action
                title="Previous Entry (Cmd+Left)"
                icon={Icon.ArrowLeft}
                onAction={handlePrev}
                shortcut={{ modifiers: ['cmd'], key: 'arrowLeft' }}
              />
            )}
          </ActionPanel.Section>
          <Action.Push
            title={`Find Synonyms for "${selectedWord}"`}
            icon={Icon.Bubble}
            target={<SynonymsCommand initialQuery={selectedWord} />}
            shortcut={{ modifiers: ['cmd'], key: 's' }}
          />
          <Action.CopyToClipboard
            title="Copy Word"
            content={selectedWord}
            shortcut={{ modifiers: ['cmd'], key: 'c' }}
          />
          <Action.CopyToClipboard
            title="Copy Full Entry"
            content={entry.body}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
          />
          {crossRefs.length > 0 && (
            <ActionPanel.Submenu
              title="Jump to Cross Reference..."
              icon={Icon.Link}
              shortcut={{ modifiers: ['cmd'], key: 'j' }}
            >
              {crossRefs.map((refId) => {
                const refEntry = getRogetEntry(refId);
                return (
                  <Action.Push
                    key={`menu-ref-${refId}`}
                    title={`${refId}. ${refEntry ? refEntry.title : 'Category'}`}
                    target={<RogetEntryDetailView entryId={refId} />}
                  />
                );
              })}
            </ActionPanel.Submenu>
          )}
          {onBack && (
            <Action
              title="Back to Categories"
              icon={Icon.MagnifyingGlass}
              onAction={onBack}
              shortcut={{ modifiers: ['cmd'], key: 'f' }}
            />
          )}
          <Action.OpenInBrowser
            title="Open on rrthesaurus.com"
            url="https://www.rrthesaurus.com/"
            shortcut={{ modifiers: ['cmd'], key: 'o' }}
          />
        </ActionPanel>
      }
    />
  );
}


/**
 * 2. Section View: Lists all categories belonging to a section
 */
export function RogetSectionView({
  classId,
  sectionId,
}: {
  classId: number;
  sectionId: string;
}) {
  const sectionData = getRogetSection(classId, sectionId);
  const [searchText, setSearchText] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [, setCycleCount] = useState(0);

  if (!sectionData) {
    return <Detail markdown="# Section Not Found" />;
  }

  const { rogetClass, section, entries } = sectionData;

  const filteredEntries = searchText.trim()
    ? entries.filter((e) => {
        const q = searchText.trim().toLowerCase();
        return (
          String(e.id).startsWith(q) ||
          e.title.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q)
        );
      })
    : entries;

  const allItemIds = filteredEntries.map((e) => `entry-${e.id}`);

  useEffect(() => {
    if (allItemIds.length > 0) {
      if (!selectedItemId || !allItemIds.includes(selectedItemId)) {
        setSelectedItemId(allItemIds[0]);
      }
    } else {
      setSelectedItemId(undefined);
    }
  }, [allItemIds.join(',')]);

  // While typing, spaces are preserved normally.
  // After word/filter is finalised with Enter, pressing space moves selection down by 1.
  const handleSearchTextChange = (text: string) => {
    // 1. Explicit clear / Backspace
    if (text === '') {
      setSearchText('');
      setIsFinalized(false);
      return;
    }

    // 2. Highlighted search bar replaced by Space (e.g. after navigating back from detail view)
    if (text.trim().length === 0 && text.length > 0 && searchText.trim().length > 0) {
      if (allItemIds.length > 0) {
        const currentIndex = selectedItemId ? allItemIds.indexOf(selectedItemId) : 0;
        const validIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = (validIndex + 1) % allItemIds.length;
        setSelectedItemId(allItemIds[nextIndex]);
      }
      setSearchText(searchText.trim());
      setIsFinalized(true);
      setCycleCount((c) => c + 1);
      return;
    }

    // 3. Empty query
    if (text.trim().length === 0) {
      setSearchText('');
      setIsFinalized(false);
      return;
    }

    // 4. Word/filter finalized with Enter, and Space pressed to cycle down
    if (isFinalized && text.endsWith(' ') && text.trim() === searchText.trim()) {
      if (allItemIds.length > 0) {
        const currentIndex = selectedItemId ? allItemIds.indexOf(selectedItemId) : 0;
        const validIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = (validIndex + 1) % allItemIds.length;
        setSelectedItemId(allItemIds[nextIndex]);
      }
      setSearchText(text.trim());
      setCycleCount((c) => c + 1);
      return;
    }

    if (text.trim() !== searchText.trim()) {
      setIsFinalized(false);
    }

    setSearchText(text);
  };

  const isFilterActive = searchText.trim().length > 0;
  const shouldRequireFinalize = isFilterActive && !isFinalized;

  return (
    <List
      navigationTitle={`${section.label} (${section.r[0]}–${section.r[1]})`}
      searchBarPlaceholder={`Filter ${entries.length} categories in ${section.label}...`}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id) setSelectedItemId(id);
      }}
    >
      <List.Section title={`${rogetClass.label} › ${section.label}`}>
        {filteredEntries.map((entry, idx) => (
          <List.Item
            key={`entry-${entry.id}`}
            id={`entry-${entry.id}`}
            icon={idx < 9 ? NUMBER_ICONS[idx + 1] || Icon.Book : Icon.Book}
            title={`${entry.id}. ${entry.title}`}
            subtitle={entry.sectionLabel}
            accessories={[
              { tag: { value: `#${entry.id}`, color: Color.Blue } },
              {
                text: idx < 9
                  ? `⌘${idx + 1}`
                  : '↵ View',
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`View ${entry.id}. ${entry.title}`}
                  icon={Icon.Eye}
                  target={<RogetEntryDetailView entryId={entry.id} />}
                  onPop={() => setIsFinalized(true)}
                />
                <Action.CopyToClipboard
                  title="Copy Entry Text"
                  content={entry.body}
                  shortcut={{ modifiers: ['cmd'], key: 'c' }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

/**
 * 3. Class View: Lists all sections belonging to a Class (e.g. Class I: Abstract Relations)
 */
export function RogetClassView({ classId }: { classId: number }) {
  const rogetClass = getRogetClass(classId);
  const [searchText, setSearchText] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [, setCycleCount] = useState(0);

  if (!rogetClass) {
    return <Detail markdown="# Class Not Found" />;
  }

  const filteredSections = searchText.trim()
    ? rogetClass.sections.filter((s, idx) => {
        const q = searchText.trim().toLowerCase();
        return (
          String(idx + 1) === q ||
          s.id.toLowerCase() === q ||
          s.label.toLowerCase().includes(q)
        );
      })
    : rogetClass.sections;

  const allItemIds = filteredSections.map((s) => `sec-${s.id}`);

  useEffect(() => {
    if (allItemIds.length > 0) {
      if (!selectedItemId || !allItemIds.includes(selectedItemId)) {
        setSelectedItemId(allItemIds[0]);
      }
    } else {
      setSelectedItemId(undefined);
    }
  }, [allItemIds.join(',')]);

  // While typing, spaces are preserved normally.
  // After word/filter is finalised with Enter, pressing space moves selection down by 1.
  const handleSearchTextChange = (text: string) => {
    // 1. Explicit clear / Backspace
    if (text === '') {
      setSearchText('');
      setIsFinalized(false);
      return;
    }

    // 2. Highlighted search bar replaced by Space (e.g. after navigating back from detail view)
    if (text.trim().length === 0 && text.length > 0 && searchText.trim().length > 0) {
      if (allItemIds.length > 0) {
        const currentIndex = selectedItemId ? allItemIds.indexOf(selectedItemId) : 0;
        const validIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = (validIndex + 1) % allItemIds.length;
        setSelectedItemId(allItemIds[nextIndex]);
      }
      setSearchText(searchText.trim());
      setIsFinalized(true);
      setCycleCount((c) => c + 1);
      return;
    }

    // 3. Empty query
    if (text.trim().length === 0) {
      setSearchText('');
      setIsFinalized(false);
      return;
    }

    // 4. Word/filter finalized with Enter, and Space pressed to cycle down
    if (isFinalized && text.endsWith(' ') && text.trim() === searchText.trim()) {
      if (allItemIds.length > 0) {
        const currentIndex = selectedItemId ? allItemIds.indexOf(selectedItemId) : 0;
        const validIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = (validIndex + 1) % allItemIds.length;
        setSelectedItemId(allItemIds[nextIndex]);
      }
      setSearchText(text.trim());
      setCycleCount((c) => c + 1);
      return;
    }

    if (text.trim() !== searchText.trim()) {
      setIsFinalized(false);
    }

    setSearchText(text);
  };

  const isFilterActive = searchText.trim().length > 0;
  const shouldRequireFinalize = isFilterActive && !isFinalized;

  return (
    <List
      navigationTitle={rogetClass.label}
      searchBarPlaceholder={`Filter sections (1–${rogetClass.sections.length})...`}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id) setSelectedItemId(id);
      }}
    >
      <List.Section title={rogetClass.label}>
        {filteredSections.map((section, idx) => (
          <List.Item
            key={`sec-${section.id}`}
            id={`sec-${section.id}`}
            icon={idx < 9 ? NUMBER_ICONS[idx + 1] || Icon.Folder : Icon.Folder}
            title={`${idx + 1}. ${section.label}`}
            subtitle={`Categories ${section.r[0]} – ${section.r[1]}`}
            accessories={[
              {
                tag: {
                  value: `${section.r[1] - section.r[0] + 1} categories`,
                  color: Color.Green,
                },
              },
              {
                text: idx < 9
                  ? `⌘${idx + 1} or ↵`
                  : '↵ View',
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Open ${section.label}`}
                  icon={Icon.ArrowRight}
                  target={<RogetSectionView classId={classId} sectionId={section.id} />}
                  onPop={() => setIsFinalized(true)}
                />
                <Action.CopyToClipboard
                  title="Copy Section Name"
                  content={section.label}
                  shortcut={{ modifiers: ['cmd'], key: 'c' }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

/**
 * Main Roget's Thesaurus Command (Alias: rr)
 * Supports number-key navigation (1-6 for classes, direct number for categories)
 * as well as full-text word search across all 1,000 categories.
 */
export default function RogetCommand(props?: RogetProps) {
  const initial =
    props?.arguments?.query ||
    props?.fallbackText ||
    props?.launchContext?.query ||
    props?.initialQuery ||
    '';

  const queryNum = /^\d+$/.test(initial.trim()) ? parseInt(initial.trim(), 10) : 0;
  const initialEntryId =
    props?.arguments?.entryId ||
    props?.launchContext?.entryId ||
    (queryNum >= 1 && queryNum <= 1000 && props?.fallbackText ? queryNum : null);

  const [activeEntryId, setActiveEntryId] = useState<number | null>(initialEntryId || null);
  const [searchText, setSearchText] = useState(initial);
  const [isFinalized, setIsFinalized] = useState(!!initial);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [, setCycleCount] = useState(0);

  // Reactive sync when props change via deep link or navigation
  useEffect(() => {
    const q = (
      props?.arguments?.query ||
      props?.fallbackText ||
      props?.launchContext?.query ||
      props?.initialQuery ||
      ''
    ).trim();

    const n = /^\d+$/.test(q) ? parseInt(q, 10) : 0;
    const id =
      props?.arguments?.entryId ||
      props?.launchContext?.entryId ||
      (n >= 1 && n <= 1000 && props?.fallbackText ? n : null);

    if (id) {
      setActiveEntryId(id);
    } else if (q && q !== searchText) {
      setSearchText(q);
      setIsFinalized(true);
    }
  }, [
    props?.arguments,
    props?.fallbackText,
    props?.launchContext,
    props?.initialQuery,
  ]);

  if (activeEntryId) {
    return <RogetEntryDetailView entryId={activeEntryId} onBack={() => setActiveEntryId(null)} />;
  }

  const classes = getRogetClasses();
  const query = searchText.trim();
  const isNumeric = /^\d+$/.test(query);

  // Search results if user entered a query
  const searchResults = query ? searchRoget(query, 40) : [];

  // Determine item IDs for space cycling
  let allItemIds: string[] = [];

  if (!query) {
    // Default Home view: 6 Classes + Featured entries
    allItemIds = [
      ...classes.map((c) => `class-${c.id}`),
      'entry-861',
      'entry-827',
      'entry-498',
      'entry-1',
      'entry-31',
      'entry-959',
      'entry-963',
    ];
  } else if (isNumeric) {
    const num = parseInt(query, 10);
    const hasClass = num >= 1 && num <= 6;
    allItemIds = [
      ...(hasClass ? [`class-${num}`] : []),
      ...searchResults.map((r) => `entry-${r.entry.id}`),
    ];
  } else {
    // Word search results
    allItemIds = searchResults.map((r) => `entry-${r.entry.id}`);
  }

  useEffect(() => {
    if (allItemIds.length > 0) {
      if (!selectedItemId || !allItemIds.includes(selectedItemId)) {
        setSelectedItemId(allItemIds[0]);
      }
    } else {
      setSelectedItemId(undefined);
    }
  }, [allItemIds.join(',')]);

  // While typing, spaces are preserved normally.
  // After word is finalised with Enter, pressing space moves selection down by 1.
  const handleSearchTextChange = (text: string) => {
    // 1. Explicit clear / Backspace
    if (text === '') {
      setSearchText('');
      setIsFinalized(false);
      return;
    }

    // 2. Highlighted search bar replaced by Space (e.g. after navigating back from detail view)
    if (text.trim().length === 0 && text.length > 0 && searchText.trim().length > 0) {
      if (allItemIds.length > 0) {
        const currentIndex = selectedItemId ? allItemIds.indexOf(selectedItemId) : 0;
        const validIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = (validIndex + 1) % allItemIds.length;
        setSelectedItemId(allItemIds[nextIndex]);
      }
      setSearchText(searchText.trim());
      setIsFinalized(true);
      setCycleCount((c) => c + 1);
      return;
    }

    // 3. Empty query
    if (text.trim().length === 0) {
      setSearchText('');
      setIsFinalized(false);
      return;
    }

    // 4. Query typed, and Space pressed to cycle down
    if (text.endsWith(' ') && text.trim() === searchText.trim()) {
      if (allItemIds.length > 0) {
        const currentIndex = selectedItemId ? allItemIds.indexOf(selectedItemId) : 0;
        const validIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = (validIndex + 1) % allItemIds.length;
        setSelectedItemId(allItemIds[nextIndex]);
      }
      setSearchText(text.trim());
      setIsFinalized(true);
      setCycleCount((c) => c + 1);
      return;
    }

    if (text.trim() !== searchText.trim()) {
      setIsFinalized(false);
    }

    setSearchText(text);
  };

  const numQuery = isNumeric ? parseInt(query, 10) : 0;
  const matchingClass = numQuery >= 1 && numQuery <= 6 ? getRogetClass(numQuery) : undefined;

  return (
    <List
      isLoading={false}
      searchBarPlaceholder="Type a number (1-6 for classes, 861 for entry) or any word to search..."
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id) setSelectedItemId(id);
      }}
    >
      {/* 1. NO QUERY: BROWSE BY NUMBER (CLASSES 1-6) + FEATURED */}
      {!query && (
        <>
          <List.Section title="ROGET'S 6 MAIN CLASSES (NAVIGATE 1–6)">
            {classes.map((rogetClass) => (
              <List.Item
                key={`class-${rogetClass.id}`}
                id={`class-${rogetClass.id}`}
                icon={NUMBER_ICONS[rogetClass.id] || Icon.Folder}
                title={rogetClass.label}
                subtitle={`${rogetClass.sections.length} sections (${rogetClass.sections[0]?.r[0]}–${
                  rogetClass.sections[rogetClass.sections.length - 1]?.r[1]
                })`}
                accessories={[
                  {
                    tag: {
                      value: `Class ${rogetClass.id}`,
                      color: Color.Blue,
                    },
                  },
                  { text: `⌘${rogetClass.id} or ↵` },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={`Open Class ${rogetClass.id}: ${rogetClass.label}`}
                      icon={Icon.ArrowRight}
                      target={<RogetClassView classId={rogetClass.id} />}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          <List.Section title="FEATURED ROGET CATEGORIES">
            {[861, 827, 498, 1, 31, 959, 963].map((id) => {
              const entry = getRogetEntry(id);
              if (!entry) return null;
              return (
                <List.Item
                  key={`entry-${entry.id}`}
                  id={`entry-${entry.id}`}
                  icon={Icon.Book}
                  title={`${entry.id}. ${entry.title}`}
                  subtitle={`${entry.classLabel} › ${entry.sectionLabel}`}
                  accessories={[
                    { tag: { value: `#${entry.id}`, color: Color.Green } },
                    { text: '↵ View' },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title={`View ${entry.id}. ${entry.title}`}
                        icon={Icon.Eye}
                        target={<RogetEntryDetailView entryId={entry.id} />}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}

      {/* 2. NUMERIC SEARCH (DIRECT JUMP TO CLASS OR CATEGORY NUMBER) */}
      {query && isNumeric && (
        <>
          {matchingClass && (
            <List.Section title="MATCHING CLASS (NAVIGATE)">
              <List.Item
                key={`class-${matchingClass.id}`}
                id={`class-${matchingClass.id}`}
                icon={NUMBER_ICONS[matchingClass.id] || Icon.Folder}
                title={matchingClass.label}
                subtitle={`${matchingClass.sections.length} sections`}
                accessories={[
                  {
                    tag: {
                      value: `Class ${matchingClass.id}`,
                      color: Color.Blue,
                    },
                  },
                  { text: 'Press ↵ to open' },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={`Open Class ${matchingClass.id}`}
                      icon={Icon.ArrowRight}
                      target={<RogetClassView classId={matchingClass.id} />}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          {searchResults.length > 0 ? (
            <List.Section title={`CATEGORIES MATCHING #${query}`}>
              {searchResults.map((result) => {
                const entry = result.entry;
                const isExact = result.matchType === 'exact_id';
                return (
                  <List.Item
                    key={`entry-${entry.id}`}
                    id={`entry-${entry.id}`}
                    icon={isExact ? Icon.CheckCircle : Icon.Book}
                    title={`${entry.id}. ${entry.title}`}
                    subtitle={`${entry.classLabel} › ${entry.sectionLabel}`}
                    accessories={[
                      {
                        tag: {
                          value: isExact ? 'Exact Match' : `#${entry.id}`,
                          color: isExact ? Color.Green : Color.SecondaryText,
                        },
                      },
                      { text: 'Space: Next | ↵ View' },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title={`View ${entry.id}. ${entry.title}`}
                          icon={Icon.Eye}
                          target={<RogetEntryDetailView entryId={entry.id} />}
                          onPop={() => setIsFinalized(true)}
                        />
                        <Action.CopyToClipboard
                          title="Copy Entry Text"
                          content={entry.body}
                          shortcut={{ modifiers: ['cmd'], key: 'c' }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          ) : (
            !matchingClass && (
              <List.EmptyView
                icon={Icon.MagnifyingGlass}
                title={`No category matching #${query}`}
                description="Roget's Thesaurus categories are numbered 1 to 1000."
              />
            )
          )}
        </>
      )}

      {/* 3. WORD SEARCH (SEARCHABLE BY JUST TYPING A WORD) */}
      {query && !isNumeric && (
        <>
          {searchResults.length === 0 ? (
            <List.EmptyView
              icon={Icon.MagnifyingGlass}
              title={`No Roget entries found for "${query}"`}
              description="Try searching for a synonym, root word, or category number (1–1000)."
            />
          ) : (
            <List.Section title={`ROGET'S THESAURUS RESULTS (${searchResults.length} found)`}>
              {searchResults.map((result) => {
                const entry = result.entry;
                const isExactTitle = result.matchType === 'exact_title';
                return (
                  <List.Item
                    key={`entry-${entry.id}`}
                    id={`entry-${entry.id}`}
                    icon={isExactTitle ? Icon.Star : Icon.Book}
                    title={`${entry.id}. ${entry.title}`}
                    subtitle={result.excerpt || `${entry.classLabel} › ${entry.sectionLabel}`}
                    accessories={[
                      {
                        tag: {
                          value: isExactTitle ? 'Title Match' : `#${entry.id}`,
                          color: isExactTitle ? Color.Green : Color.Blue,
                        },
                      },
                      { text: 'Space: Next | ↵ View' },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title={`View ${entry.id}. ${entry.title}`}
                          icon={Icon.Eye}
                          target={<RogetEntryDetailView entryId={entry.id} />}
                          onPop={() => setIsFinalized(true)}
                        />
                        <Action.CopyToClipboard
                          title="Copy Entry Text"
                          content={entry.body}
                          shortcut={{ modifiers: ['cmd'], key: 'c' }}
                        />
                        <Action.Push
                          title={`Define "${entry.title}" in def`}
                          icon={Icon.MagnifyingGlass}
                          target={<DefCommand initialQuery={entry.title} />}
                          shortcut={{ modifiers: ['cmd'], key: 'd' }}
                        />
                        <Action.OpenInBrowser
                          title="Open on rrthesaurus.com"
                          url="https://www.rrthesaurus.com/"
                          shortcut={{ modifiers: ['cmd'], key: 'o' }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
