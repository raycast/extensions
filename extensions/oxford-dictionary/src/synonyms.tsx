import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
} from '@raycast/api';
import {
  ThesaurusResult,
  SynonymItem,
  WordSuggestion,
  ExtensionPreferences,
} from './types/dictionary';
import { searchThesaurus } from './services/dictionary-manager';
import { getWordSuggestions } from './services/spell-check-service';
import { speakWord } from './services/pronunciation-service';
import {
  getPosColor,
  getPosIcon,
  buildSynonymsDetailMarkdown,
  buildGridRows,
  getNextGridIndex,
} from './utils/ui-helpers';
import DefCommand from './def';

export type SynonymsProps = {
  arguments?: { word?: string };
  launchType?: any;
  initialQuery?: string;
  fallbackText?: string;
  launchContext?: { word?: string; query?: string };
};

/**
 * Full-width Detail View for Synonyms & Thesaurus results:
 * - Comma-separated list of words (as before, no vertical box rows)
 * - Each word is clickable to open definition in def
 * - Navigatable with Arrow Keys (← / → to move, ↑ / ↓ to jump 5)
 * - Selected word highlighted with ✦ word ✦
 * - Pressing ↵ Enter opens the definition of the selected word
 */
export function SynonymsDetailView({
  word,
  data,
  onSearchAnother,
}: {
  word: string;
  data: ThesaurusResult;
  onSearchAnother?: () => void;
}) {
  const directSynonyms = data.synonyms.filter((s) => s.relationType === 'synonym');
  const relatedWords = data.synonyms.filter((s) => s.relationType === 'related');
  const antonyms = data.antonyms;

  const { allWords, rows } = useMemo(
    () =>
      buildGridRows(
        [
          directSynonyms.map((s) => s.word),
          relatedWords.map((r) => r.word),
          antonyms.map((a) => a.word),
        ],
        5
      ),
    [directSynonyms, relatedWords, antonyms]
  );

  const [selectedWordIndex, setSelectedWordIndex] = useState(0);

  const selectedWord =
    allWords.length > 0 ? allWords[selectedWordIndex] || allWords[0] : word;

  const handleNextWord = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'right', allWords.length));
  const handlePrevWord = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'left', allWords.length));
  const handleDownLine = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'down', allWords.length));
  const handleUpLine = () =>
    setSelectedWordIndex((i) => getNextGridIndex(i, rows, 'up', allWords.length));

  const handlePronounce = async (wordToSpeak: string) => {
    try {
      showToast({ style: Toast.Style.Animated, title: `Pronouncing "${wordToSpeak}"...` });
      await speakWord(wordToSpeak);
      showToast({ style: Toast.Style.Success, title: `Pronounced "${wordToSpeak}"` });
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
      navigationTitle={`${word.toUpperCase()} · Thesaurus`}
      markdown={buildSynonymsDetailMarkdown(
        word,
        directSynonyms,
        relatedWords,
        antonyms,
        data.source,
        selectedWord
      )}
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
          <Action.Push
            title={`Find Synonyms for "${selectedWord}"`}
            icon={Icon.Bubble}
            target={<SynonymsCommand initialQuery={selectedWord} />}
            shortcut={{ modifiers: ['cmd'], key: 's' }}
          />
          <Action
            title="Pronounce Word"
            icon={Icon.SpeakerHigh}
            onAction={() => handlePronounce(selectedWord)}
            shortcut={{ modifiers: ['cmd'], key: 'p' }}
          />
          <Action.CopyToClipboard
            title="Copy Word"
            content={selectedWord}
            shortcut={{ modifiers: ['cmd'], key: 'c' }}
          />
          {onSearchAnother ? (
            <Action
              title="Search Another Word"
              icon={Icon.MagnifyingGlass}
              onAction={onSearchAnother}
              shortcut={{ modifiers: ['cmd'], key: 'f' }}
            />
          ) : (
            <Action.Push
              title="Search Another Word"
              icon={Icon.MagnifyingGlass}
              target={<SynonymsSearchList />}
              shortcut={{ modifiers: ['cmd'], key: 'f' }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

/**
 * Live search list for typing thesaurus queries and viewing spelling suggestions / completions
 */
export function SynonymsSearchList({ initialText = '' }: { initialText?: string }) {
  const [searchText, setSearchText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<ThesaurusResult | null>(null);
  const [suggestions, setSuggestions] = useState<{
    completions: WordSuggestion[];
    spellingSuggestions: WordSuggestion[];
  } | null>(null);

  const preferences = getPreferenceValues<ExtensionPreferences>();

  const executeSearch = useCallback(
    async (wordToSearch: string) => {
      const query = wordToSearch.trim();
      if (!query) {
        setData(null);
        setSuggestions(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [res, sugg] = await Promise.all([
          searchThesaurus(query, preferences),
          getWordSuggestions(query, preferences),
        ]);
        setData(res);
        setSuggestions({
          completions: sugg.completions,
          spellingSuggestions: sugg.spellingSuggestions,
        });
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Thesaurus Error',
          message: String(err),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [preferences]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText.trim()) {
        executeSearch(searchText);
      } else {
        setData(null);
        setSuggestions(null);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchText, executeSearch]);

  const directSynonyms = data?.synonyms.filter((s) => s.relationType === 'synonym') || [];
  const relatedWords = data?.synonyms.filter((s) => s.relationType === 'related') || [];
  const antonyms = data?.antonyms || [];
  const hasThesaurusResults = directSynonyms.length > 0 || relatedWords.length > 0 || antonyms.length > 0;
  const spellingSuggestions = suggestions?.spellingSuggestions || [];
  const completions = suggestions?.completions || [];

  const [isFinalized, setIsFinalized] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [, setCycleCount] = useState(0);

  const allItemIds = [
    ...(hasThesaurusResults ? [`thesaurus-match`] : []),
    ...spellingSuggestions.map((s) => `spell-${s.word}`),
    ...completions.map((c) => `comp-${c.word}`),
  ];

  useEffect(() => {
    if (allItemIds.length > 0) {
      if (!selectedItemId || !allItemIds.includes(selectedItemId)) {
        setSelectedItemId(allItemIds[0]);
      }
    } else {
      setSelectedItemId(undefined);
    }
  }, [allItemIds.join(',')]);

  const handleSearchTextChange = (text: string) => {
    if (text === '') {
      setSearchText('');
      setIsFinalized(false);
      return;
    }

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

    if (text.trim().length === 0) {
      setSearchText('');
      setIsFinalized(false);
      return;
    }

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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Find synonyms & related words (e.g. happy, intelligent, fast)..."
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id) setSelectedItemId(id);
      }}
      isShowingDetail={false}
    >
      {!hasThesaurusResults && spellingSuggestions.length === 0 && completions.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText.trim() ? `No synonyms for "${searchText}"` : 'Type a word to find synonyms'}
          description={
            searchText.trim()
              ? 'Try checking the spelling or searching for the root word.'
              : 'Dedicated Thesaurus command. Shows direct synonyms, nuances, antonyms & live spell-check. Works offline!'
          }
        />
      ) : (
        <>
          {/* 1. THESAURUS MATCH (Highest Priority) */}
          {hasThesaurusResults && data && (
            <List.Section title="THESAURUS RESULTS">
              <List.Item
                id="thesaurus-match"
                icon={{ source: Icon.Bubble, tintColor: Color.Green }}
                title={`Synonyms for "${data.targetWord || searchText.trim()}"`}
                subtitle={`${directSynonyms.length} direct, ${relatedWords.length} related, ${antonyms.length} antonyms`}
                accessories={[
                  {
                    tag: {
                      value: `${directSynonyms.length + relatedWords.length + antonyms.length} words`,
                      color: Color.Green,
                    },
                  },
                  { text: '↵ Open Thesaurus' },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={`View Synonyms for "${data.targetWord || searchText.trim()}"`}
                      icon={Icon.Bubble}
                      target={
                        <SynonymsDetailView
                          word={data.targetWord || searchText.trim()}
                          data={data}
                        />
                      }
                      onPop={() => setIsFinalized(true)}
                    />
                    <Action.Push
                      title={`Define "${data.targetWord || searchText.trim()}" in def`}
                      icon={Icon.Book}
                      target={<DefCommand initialQuery={data.targetWord || searchText.trim()} />}
                      shortcut={{ modifiers: ['cmd'], key: 'd' }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          {/* 2. SPELLING SUGGESTIONS */}
          {spellingSuggestions.length > 0 && (
            <List.Section title="DID YOU MEAN? (SPELLING SUGGESTIONS)">
              {spellingSuggestions.map((item) => (
                <List.Item
                  key={`spell-${item.word}`}
                  id={`spell-${item.word}`}
                  icon={{ source: Icon.Wand, tintColor: Color.Orange }}
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
                    { text: '↵ View Synonyms' },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title={`Find Synonyms for "${item.word}"`}
                        icon={Icon.Bubble}
                        target={<SynonymsCommand initialQuery={item.word} />}
                        onPop={() => setIsFinalized(true)}
                      />
                      <Action.Push
                        title={`Define "${item.word}" in def`}
                        icon={Icon.Book}
                        target={<DefCommand initialQuery={item.word} />}
                        shortcut={{ modifiers: ['cmd'], key: 'd' }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {/* 3. COMPLETIONS AS TYPED */}
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
                  accessories={[{ text: '↵ View Synonyms' }]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title={`Find Synonyms for "${item.word}"`}
                        icon={Icon.Bubble}
                        target={<SynonymsCommand initialQuery={item.word} />}
                        onPop={() => setIsFinalized(true)}
                      />
                      <Action.Push
                        title={`Define "${item.word}" in def`}
                        icon={Icon.Book}
                        target={<DefCommand initialQuery={item.word} />}
                        shortcut={{ modifiers: ['cmd'], key: 'd' }}
                      />
                    </ActionPanel>
                  }
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
 * Main synonyms command entrypoint
 */
export default function SynonymsCommand(props?: SynonymsProps) {
  const queryWord = (
    props?.arguments?.word ||
    props?.fallbackText ||
    props?.launchContext?.word ||
    props?.launchContext?.query ||
    props?.initialQuery ||
    ''
  ).trim();

  const [targetWord, setTargetWord] = useState(queryWord);
  const [isLoading, setIsLoading] = useState(!!queryWord);
  const [data, setData] = useState<ThesaurusResult | null>(null);

  const preferences = getPreferenceValues<ExtensionPreferences>();

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
      return;
    }

    let isCurrent = true;
    setIsLoading(true);

    searchThesaurus(targetWord, preferences)
      .then((res) => {
        if (isCurrent) {
          setData(res);
          setIsLoading(false);
          const hasResults =
            res.synonyms.length > 0 || res.antonyms.length > 0;
          if (!hasResults) {
            showToast({
              style: Toast.Style.Failure,
              title: `No synonyms found for "${targetWord}"`,
            });
          }
        }
      })
      .catch((err) => {
        if (isCurrent) {
          setIsLoading(false);
          showToast({
            style: Toast.Style.Failure,
            title: 'Thesaurus Error',
            message: String(err),
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [targetWord, preferences]);

  if (targetWord) {
    if (isLoading) {
      return (
        <Detail
          isLoading={true}
          markdown={`# ${targetWord.toUpperCase()}\n\n*Looking up synonyms & antonyms...*`}
        />
      );
    }

    if (data && (data.synonyms.length > 0 || data.antonyms.length > 0)) {
      return <SynonymsDetailView word={targetWord} data={data} />;
    }

    return (
      <Detail
        markdown={`# No synonyms found for "${targetWord}"\n\nTry checking the spelling or searching for the root word.`}
        actions={
          <ActionPanel>
            <Action.Push
              title="Search Another Word"
              icon={Icon.MagnifyingGlass}
              target={<SynonymsSearchList initialText={targetWord} />}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <SynonymsSearchList />;
}
