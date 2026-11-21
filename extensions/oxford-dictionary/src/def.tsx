import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Detail,
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from '@raycast/api';
import { WordResult, WordSuggestion, ExtensionPreferences } from './types/dictionary';
import { searchWord } from './services/dictionary-manager';
import { getWordSuggestions } from './services/spell-check-service';
import { speakWord } from './services/pronunciation-service';
import { searchVectorSynonyms } from './services/vector-search-service';
import {
  getPosColor,
  getPosIcon,
  buildWordDetailMarkdown,
  buildGridRows,
  getNextGridIndex,
} from './utils/ui-helpers';
import SynonymsCommand from './synonyms';

export type DefProps = {
  arguments?: { word?: string };
  launchType?: any;
  initialQuery?: string;
  fallbackText?: string;
  launchContext?: { word?: string; query?: string; [key: string]: any };
};

async function handlePronounce(word: string) {
  try {
    showToast({ style: Toast.Style.Animated, title: `Pronouncing "${word}"...` });
    await speakWord(word);
    showToast({ style: Toast.Style.Success, title: `Pronounced "${word}"` });
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Speech Error',
      message: String(err),
    });
  }
}

/**
 * Clean Full-Width Detail View (Right column removed):
 * Top left: word, under it: type ⋅ pronunciation (syllables)
 * Definitions under that
 * Offline indicator top right if offline
 * Synonyms and Antonyms below definitions as clickable text links (no boxes)
 */
export function WordDetailView({ result }: { result: WordResult }) {
  const primaryMeaning = result.meanings[0];
  const allSynonyms = Array.from(
    new Set([
      ...(result.allSynonyms || []),
      ...result.meanings.flatMap((m) => m.synonyms || []),
    ])
  );
  const allAntonyms = Array.from(
    new Set([
      ...(result.allAntonyms || []),
      ...result.meanings.flatMap((m) => m.antonyms || []),
    ])
  );

  const [vectorSynonyms, setVectorSynonyms] = useState<string[]>([]);

  useEffect(() => {
    let isCancelled = false;
    try {
      const prefs = getPreferenceValues<ExtensionPreferences>();
      searchVectorSynonyms(result.word, prefs, 5)
        .then((hits) => {
          if (!isCancelled) {
            setVectorSynonyms(hits.map((h) => h.word));
          }
        })
        .catch(() => {});
    } catch {
      // Preferences not available or offline
    }
    return () => {
      isCancelled = true;
    };
  }, [result.word]);

  const top3Vector = useMemo(() => {
    const lowerAll = new Set(allSynonyms.map((s) => s.toLowerCase()));
    return vectorSynonyms
      .filter((v) => v.toLowerCase() !== result.word.toLowerCase() && !lowerAll.has(v.toLowerCase()))
      .slice(0, 3);
  }, [vectorSynonyms, allSynonyms, result.word]);

  const combinedSynonyms = useMemo(
    () => [...top3Vector, ...allSynonyms],
    [top3Vector, allSynonyms]
  );

  const { allWords, rows } = useMemo(
    () => buildGridRows([combinedSynonyms, allAntonyms], 5),
    [combinedSynonyms, allAntonyms]
  );
  const [selectedWordIndex, setSelectedWordIndex] = useState(0);

  const selectedWord =
    allWords.length > 0 ? allWords[selectedWordIndex] || allWords[0] : result.word;

  const handleNextWord = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'right', allWords.length));
  const handlePrevWord = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'left', allWords.length));
  const handleDownLine = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'down', allWords.length));
  const handleUpLine = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'up', allWords.length));

  const handlePronounce = async (word: string) => {
    try {
      showToast({ style: Toast.Style.Animated, title: `Pronouncing "${word}"...` });
      await speakWord(word);
      showToast({ style: Toast.Style.Success, title: `Pronounced "${word}"` });
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Speech Error',
        message: String(err),
      });
    }
  };

  return (
    <Detail
      isLoading={false}
      navigationTitle={`${result.word.toUpperCase()} · ${primaryMeaning?.partOfSpeech || 'word'}`}
      markdown={buildWordDetailMarkdown(result, allSynonyms, allAntonyms, selectedWord, vectorSynonyms)}
      actions={
        <ActionPanel>
          <Action.Push
            title={`Define "${selectedWord}"`}
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
          <Action
            title="Speak / Pronounce Word"
            icon={Icon.SpeakerHigh}
            onAction={() => handlePronounce(result.word)}
            shortcut={{ modifiers: ['cmd'], key: 'p' }}
          />
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
            title="Copy Definition"
            content={`${result.word} (${primaryMeaning?.partOfSpeech || 'word'}): ${
              primaryMeaning?.definitions[0] || ''
            }`}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
          />
          {allSynonyms.length > 0 && (
            <ActionPanel.Submenu
              title="Look Up Synonym in def..."
              icon={Icon.MagnifyingGlass}
            >
              {allSynonyms.map((syn) => (
                <Action.Push
                  key={syn}
                  title={`Define "${syn}"`}
                  target={<DefCommand initialQuery={syn} />}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          <ActionPanel.Section title="Navigation">
            <Action.Push
              title="Search Another Word"
              icon={Icon.MagnifyingGlass}
              target={<WordSearchList />}
              shortcut={{ modifiers: ['cmd'], key: 'f' }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="External Links">
            <Action.OpenInBrowser
              title="Open on Oxford Reference"
              url={`https://www.oxfordreference.com/search?q=${encodeURIComponent(result.word)}`}
              shortcut={{ modifiers: ['cmd'], key: 'o' }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}


/**
 * Word Search List with real-time spell check and autocomplete suggestions as typed
 */
export function WordSearchList({ initialText = '' }: { initialText?: string }) {
  const [searchText, setSearchText] = useState(initialText);
  const [isFinalized, setIsFinalized] = useState(!!initialText);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [, setCycleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    exactMatch: WordResult | null;
    completions: WordSuggestion[];
    spellingSuggestions: WordSuggestion[];
  } | null>(null);

  const preferences = getPreferenceValues<ExtensionPreferences>();
  const queryRef = React.useRef(searchText);
  queryRef.current = searchText;

  const executeSearch = useCallback(
    async (wordToSearch: string) => {
      const query = wordToSearch.trim();
      if (!query) {
        if (queryRef.current.trim() === '') {
          setSuggestions(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const data = await getWordSuggestions(query, preferences);
        // Only apply suggestions if query is STILL the latest search text
        if (queryRef.current.trim().toLowerCase() === query.toLowerCase()) {
          setSuggestions(data);
        }
      } catch (err) {
        if (queryRef.current.trim().toLowerCase() === query.toLowerCase()) {
          showToast({
            style: Toast.Style.Failure,
            title: 'Lookup Error',
            message: String(err),
          });
        }
      } finally {
        if (queryRef.current.trim().toLowerCase() === query.toLowerCase()) {
          setIsLoading(false);
        }
      }
    },
    [preferences]
  );

  useEffect(() => {
    const clean = searchText.trim();
    if (!clean) {
      setSuggestions(null);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(clean);
    }, 75);

    return () => clearTimeout(timer);
  }, [searchText, executeSearch]);

  const cleanSearch = searchText.trim().toLowerCase();
  const exactMatch = suggestions?.exactMatch;
  const completions = suggestions?.completions || [];
  const spellingSuggestions = suggestions?.spellingSuggestions || [];

  const hasLoadedExact = !!exactMatch && exactMatch.word.toLowerCase() === cleanSearch;

  // If the user typed a word and exactMatch hasn't loaded yet,
  // we provide an immediate search item so pressing Enter on the active text NEVER selects a stale word!
  const defineCurrentId =
    cleanSearch && !hasLoadedExact ? `define-current-${cleanSearch}` : undefined;

  const hasAnyResults =
    !!exactMatch || completions.length > 0 || spellingSuggestions.length > 0 || !!defineCurrentId;

  // Priority order: Exact match is ALWAYS prioritised higher than any spell check!
  const allItemIds = [
    ...(hasLoadedExact ? [`exact-${exactMatch.word}`] : []),
    ...(defineCurrentId ? [defineCurrentId] : []),
    ...completions
      .filter((c) => c.word.toLowerCase() !== cleanSearch)
      .map((c) => `comp-${c.word}`),
    ...spellingSuggestions
      .filter((s) => s.word.toLowerCase() !== cleanSearch)
      .map((s) => `spell-${s.word}`),
  ];

  // Keep selected item valid as suggestions update
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
    const cleanNew = text.trim().toLowerCase();
    const cleanOld = searchText.trim().toLowerCase();

    // 1. Explicit clear / Backspace
    if (text === '') {
      setSearchText('');
      setSuggestions(null);
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
      setSuggestions(null);
      setIsFinalized(false);
      return;
    }

    // 4. Word typed, and Space pressed to cycle down
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

    if (cleanNew !== cleanOld) {
      setIsFinalized(false);
      // Immediately wipe out previous suggestions if they belonged to a different word!
      if (suggestions && suggestions.exactMatch?.word.toLowerCase() !== cleanNew) {
        setSuggestions(null);
      }
    }

    setSearchText(text);
  };

  const navHint = 'Space: Next | ↵ View';

  const renderItemActions = (
    title: string,
    target: any,
    wordToSpeak: string
  ) => (
    <ActionPanel>
      <Action.Push
        title={title}
        icon={Icon.Book}
        target={target}
        onPop={() => setIsFinalized(true)}
      />
      <Action
        title="Speak / Pronounce Word"
        icon={Icon.SpeakerHigh}
        onAction={() => handlePronounce(wordToSpeak)}
        shortcut={{ modifiers: ['cmd'], key: 'p' }}
      />
      <Action.Push
        title="Open in Thesaurus"
        icon={Icon.Bubble}
        target={<SynonymsCommand initialQuery={wordToSpeak} />}
        shortcut={{ modifiers: ['cmd'], key: 't' }}
      />
      <Action.CopyToClipboard
        title="Copy Word"
        content={wordToSpeak}
        shortcut={{ modifiers: ['cmd'], key: 'c' }}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search word or spelling (e.g. oblige, epistemological, definately)..."
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id) setSelectedItemId(id);
      }}
      isShowingDetail={false}
    >
      {!hasAnyResults ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText.trim() ? `No definitions found for "${searchText}"` : 'Type a word to define'}
          description={
            searchText.trim()
              ? 'Try checking the spelling or searching for the root word.'
              : 'Shows word type, pronunciation, definitions & live spell-check suggestions as you type. Works offline!'
          }
        />
      ) : (
        <>
          {/* Immediate Action for Active Query while typing or loading */}
          {defineCurrentId && (
            <List.Section title="SEARCH">
              <List.Item
                key={defineCurrentId}
                id={defineCurrentId}
                icon={Icon.MagnifyingGlass}
                title={`Define "${searchText.trim()}"`}
                subtitle="Press ↵ to view definitions & synonyms"
                accessories={[{ text: '↵ Enter' }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={`Define "${searchText.trim()}"`}
                      icon={Icon.Book}
                      target={<DefCommand initialQuery={searchText.trim()} />}
                    />
                    <Action
                      title="Speak / Pronounce Word"
                      icon={Icon.SpeakerHigh}
                      onAction={() => handlePronounce(searchText.trim())}
                      shortcut={{ modifiers: ['cmd'], key: 'p' }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          {/* 1. EXACT MATCH (Highest priority when word is matched) */}
          {hasLoadedExact && exactMatch && (
            <List.Section title="EXACT MATCH">
              <List.Item
                key={`exact-${exactMatch.word}`}
                id={`exact-${exactMatch.word}`}
                icon={{
                  source: getPosIcon(exactMatch.meanings[0]?.partOfSpeech || 'noun'),
                  tintColor: getPosColor(exactMatch.meanings[0]?.partOfSpeech || 'noun'),
                }}
                title={exactMatch.word}
                subtitle={`${exactMatch.meanings[0]?.partOfSpeech || ''} ⋅ ${
                  exactMatch.meanings[0]?.definitions[0] || ''
                }`}
                accessories={[
                  {
                    tag: {
                      value: exactMatch.meanings[0]?.partOfSpeech || 'word',
                      color: getPosColor(exactMatch.meanings[0]?.partOfSpeech || 'noun'),
                    },
                  },
                  {
                    text: navHint,
                  },
                ]}
                actions={renderItemActions(
                  'View Definitions & Synonyms',
                  <WordDetailView result={exactMatch} />,
                  exactMatch.word
                )}
              />
            </List.Section>
          )}

          {/* 2. SPELLING SUGGESTIONS (DID YOU MEAN?) - Shown at top ONLY if NO exact match (misspelled word) */}
          {!hasLoadedExact && spellingSuggestions.length > 0 && (
            <List.Section title="DID YOU MEAN? (SPELLING SUGGESTIONS)">
              {spellingSuggestions.map((item) => (
                <List.Item
                  key={`spell-${item.word}`}
                  id={`spell-${item.word}`}
                  icon={{
                    source: Icon.Wand,
                    tintColor: Color.Orange,
                  }}
                  title={item.word}
                  subtitle={
                    item.shortDefinition
                      ? `${item.partOfSpeech || ''} ⋅ ${item.shortDefinition}`
                      : undefined
                  }
                  accessories={[
                    {
                      tag: {
                        value: 'Did you mean?',
                        color: Color.Orange,
                      },
                    },
                    {
                      text: navHint,
                    },
                  ]}
                  actions={renderItemActions(
                    `Define "${item.word}"`,
                    <DefCommand initialQuery={item.word} />,
                    item.word
                  )}
                />
              ))}
            </List.Section>
          )}

          {/* 3. AUTOCOMPLETE SUGGESTIONS (AS BEING TYPED) */}
          {completions.length > 0 && (
            <List.Section title="SUGGESTIONS (AS YOU TYPE)">
              {completions.map((item) => (
                <List.Item
                  key={`comp-${item.word}`}
                  id={`comp-${item.word}`}
                  icon={{
                    source: item.partOfSpeech
                      ? getPosIcon(item.partOfSpeech)
                      : Icon.MagnifyingGlass,
                    tintColor: item.partOfSpeech
                      ? getPosColor(item.partOfSpeech)
                      : Color.SecondaryText,
                  }}
                  title={item.word}
                  subtitle={
                    item.shortDefinition
                      ? `${item.partOfSpeech || ''} ⋅ ${item.shortDefinition}`
                      : undefined
                  }
                  accessories={[
                    item.partOfSpeech
                      ? {
                          tag: {
                            value: item.partOfSpeech,
                            color: getPosColor(item.partOfSpeech),
                          },
                        }
                      : { text: 'Suggestion' },
                    { text: navHint },
                  ]}
                  actions={renderItemActions(
                    `Define "${item.word}"`,
                    <DefCommand initialQuery={item.word} />,
                    item.word
                  )}
                />
              ))}
            </List.Section>
          )}

          {/* 4. OTHER SPELLINGS - Shown at bottom if exact match exists */}
          {exactMatch && spellingSuggestions.length > 0 && (
            <List.Section title="DID YOU MEAN? (OTHER SPELLINGS)">
              {spellingSuggestions.map((item) => (
                <List.Item
                  key={`spell-${item.word}`}
                  id={`spell-${item.word}`}
                  icon={{
                    source: Icon.Wand,
                    tintColor: Color.Orange,
                  }}
                  title={item.word}
                  subtitle={
                    item.shortDefinition
                      ? `${item.partOfSpeech || ''} ⋅ ${item.shortDefinition}`
                      : undefined
                  }
                  accessories={[
                    {
                      tag: {
                        value: 'Alternative',
                        color: Color.Orange,
                      },
                    },
                    {
                      text: navHint,
                    },
                  ]}
                  actions={renderItemActions(
                    `Define "${item.word}"`,
                    <DefCommand initialQuery={item.word} />,
                    item.word
                  )}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

/**
 * Main def command entrypoint
 */
export default function DefCommand(props?: DefProps) {
  const queryWord =
    props?.arguments?.word ||
    props?.fallbackText ||
    props?.launchContext?.word ||
    props?.launchContext?.query ||
    props?.initialQuery ||
    '';
  const [targetWord, setTargetWord] = useState(queryWord.trim());
  const [isLoading, setIsLoading] = useState(!!queryWord.trim());
  const [result, setResult] = useState<WordResult | null>(null);
  const [spellSuggestions, setSpellSuggestions] = useState<WordSuggestion[]>([]);

  const preferences = getPreferenceValues<ExtensionPreferences>();

  // Reactive sync when opened via deep link or pushed with new query word
  useEffect(() => {
    const nextWord = (
      props?.arguments?.word ||
      props?.fallbackText ||
      props?.launchContext?.word ||
      props?.launchContext?.query ||
      props?.initialQuery ||
      ''
    ).trim();

    if (nextWord && nextWord !== targetWord) {
      setTargetWord(nextWord);
    }
  }, [
    props?.arguments?.word,
    props?.fallbackText,
    props?.launchContext?.word,
    props?.launchContext?.query,
    props?.initialQuery,
  ]);

  useEffect(() => {
    if (!targetWord) {
      setIsLoading(false);
      setResult(null);
      setSpellSuggestions([]);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    setResult(null);
    setSpellSuggestions([]);

    getWordSuggestions(targetWord, preferences)
      .then((data) => {
        if (isCurrent) {
          setResult(data.exactMatch);
          setSpellSuggestions(data.spellingSuggestions);
          setIsLoading(false);
          if (!data.exactMatch && data.spellingSuggestions.length === 0) {
            showToast({
              style: Toast.Style.Failure,
              title: `No definitions found for "${targetWord}"`,
            });
          }
        }
      })
      .catch((err) => {
        if (isCurrent) {
          setIsLoading(false);
          showToast({
            style: Toast.Style.Failure,
            title: 'Lookup Error',
            message: String(err),
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [targetWord, preferences]);

  // If a word was provided via arguments or initialQuery
  if (targetWord) {
    if (isLoading) {
      return (
        <Detail
          isLoading={true}
          markdown={`# ${targetWord.toUpperCase()}\n\n*Looking up definitions, pronunciation & spell-check suggestions...*`}
        />
      );
    }

    if (result && result.word.toLowerCase() === targetWord.toLowerCase()) {
      return <WordDetailView result={result} />;
    }

    // Word not found: Check if we have spelling suggestions ("Did you mean?")
    if (spellSuggestions.length > 0) {
      const topSuggestion = spellSuggestions[0];
      const markdown = [
        `# No definition for "${targetWord}"`,
        '',
        `### Did you mean:`,
        ...spellSuggestions.map(
          (s) =>
            `* **${s.word}** ${s.partOfSpeech ? `\`${s.partOfSpeech}\`` : ''} ${
              s.shortDefinition ? `— _${s.shortDefinition}_` : ''
            }`
        ),
      ].join('\n');

      return (
        <Detail
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action.Push
                title={`Define "${topSuggestion.word}"`}
                icon={Icon.Book}
                target={<DefCommand initialQuery={topSuggestion.word} />}
              />
              {spellSuggestions.slice(1).map((s) => (
                <Action.Push
                  key={s.word}
                  title={`Define "${s.word}"`}
                  target={<DefCommand initialQuery={s.word} />}
                />
              ))}
              <Action.Push
                title="Search Another Word"
                icon={Icon.MagnifyingGlass}
                target={<WordSearchList />}
              />
            </ActionPanel>
          }
        />
      );
    }

    return (
      <Detail
        markdown={`# No definitions found for "${targetWord}"\n\nTry checking the spelling or searching for the root word.`}
        actions={
          <ActionPanel>
            <Action.Push
              title="Search Another Word"
              icon={Icon.MagnifyingGlass}
              target={<WordSearchList initialText={targetWord} />}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Otherwise, render the live search list with spell check & suggestions as typed
  return <WordSearchList />;
}
