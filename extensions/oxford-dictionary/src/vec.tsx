import React, { useState, useEffect, useCallback } from 'react';
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
} from '@raycast/api';
import { VectorSearchResult, ExtensionPreferences } from './types/dictionary';
import { searchVectorSynonyms } from './services/vector-search-service';
import { speakWord } from './services/pronunciation-service';
import { getPosColor, getPosIcon } from './utils/ui-helpers';
import DefCommand from './def';
import SynonymsCommand from './synonyms';

export type VecProps = {
  arguments?: { query?: string };
  launchType?: any;
  initialQuery?: string;
  fallbackText?: string;
};

function getSimilarityColor(percent: number): Color {
  if (percent >= 90) return Color.Green;
  if (percent >= 75) return Color.Blue;
  if (percent >= 60) return Color.Orange;
  return Color.SecondaryText;
}

export default function VecCommand(props?: VecProps) {
  const initial =
    props?.arguments?.query ||
    props?.fallbackText ||
    props?.initialQuery ||
    '';
  const [searchText, setSearchText] = useState(initial);
  const [isFinalized, setIsFinalized] = useState(!!initial);
  const [results, setResults] = useState<VectorSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [, setCycleCount] = useState(0);

  const preferences = getPreferenceValues<ExtensionPreferences>();

  const executeSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const hits = await searchVectorSynonyms(q, preferences, 50);
        setResults(hits);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Vector Search Error',
          message: String(err),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [preferences]
  );

  useEffect(() => {
    if (searchText.trim()) {
      const timer = setTimeout(() => {
        executeSearch(searchText);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [searchText, executeSearch]);

  const allItemIds = results.map((item, idx) => `vec-${item.word}-${idx}`);

  useEffect(() => {
    if (allItemIds.length > 0) {
      if (!selectedItemId || !allItemIds.includes(selectedItemId)) {
        setSelectedItemId(allItemIds[0]);
      }
    } else {
      setSelectedItemId(undefined);
    }
  }, [allItemIds.join(',')]);

  // While typing, spaces are preserved normally so multiple seed words can be entered.
  // After seeds are finalized or after returning from a detail view, pressing space cycles down.
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

    // 4. Seeds finalized with Enter, and Space pressed to cycle down
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

  const navHint = isFinalized ? 'Space: Next | ↵ Define' : '↵ Define';

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
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter seed words to find semantically close synonyms (e.g. 'brave bold knight', 'dark gloomy stormy')..."
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id) setSelectedItemId(id);
      }}
    >
      {results.length === 0 ? (
        <List.EmptyView
          icon={Icon.Compass}
          title={searchText.trim() ? `No semantic matches found for "${searchText}"` : 'Vector Semantic Synonym Search'}
          description={
            searchText.trim()
              ? 'Try using different seed words, general concepts, or single-word anchors.'
              : 'Enter a few words describing a mood, theme, or concept (e.g. "brave courageous knight" or "fast agile swift") to find words ranked by semantic vector closeness.'
          }
        />
      ) : (
        <List.Section title={`SEMANTICALLY CLOSE WORDS (${results.length} ranked by vector similarity)`}>
          {results.map((item, idx) => {
            const pos = item.partOfSpeech || 'noun';
            const icon = getPosIcon(pos);
            const color = getPosColor(pos);
            const simColor = getSimilarityColor(item.matchPercent);

            const accessories: any[] = [
              {
                tag: {
                  value: `${item.matchPercent}% match`,
                  color: simColor,
                },
              },
            ];

            if (item.partOfSpeech) {
              accessories.push({
                tag: {
                  value: pos,
                  color: color,
                },
              });
            }

            accessories.push({
              text: navHint,
            });

            return (
              <List.Item
                key={`vec-${item.word}-${idx}`}
                id={`vec-${item.word}-${idx}`}
                icon={{ source: icon, tintColor: color }}
                title={item.word}
                subtitle={item.definition || (item.source === 'offline' ? 'Roget vector cluster' : undefined)}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Explore Word">
                      <Action.Push
                        title={`Define "${item.word}" in def`}
                        icon={Icon.Book}
                        target={<DefCommand initialQuery={item.word} />}
                        onPop={() => setIsFinalized(true)}
                      />
                      <Action
                        title={isFinalized ? "Edit Search Seeds" : "Finalise Seeds (Space to Browse)"}
                        icon={isFinalized ? Icon.Pencil : Icon.Check}
                        onAction={() => setIsFinalized(!isFinalized)}
                        shortcut={{ modifiers: ['cmd'], key: 'f' }}
                      />
                      <Action.Push
                        title={`Find Synonyms for "${item.word}"`}
                        icon={Icon.Bubble}
                        target={<SynonymsCommand initialQuery={item.word} />}
                        shortcut={{ modifiers: ['cmd'], key: 't' }}
                      />
                      <Action
                        title="Pronounce Word"
                        icon={Icon.SpeakerHigh}
                        onAction={() => handlePronounce(item.word)}
                        shortcut={{ modifiers: ['cmd'], key: 'p' }}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Copy & Use">
                      <Action.CopyToClipboard
                        title="Copy Word"
                        content={item.word}
                        shortcut={{ modifiers: ['cmd'], key: 'c' }}
                      />
                      <Action.Paste
                        title="Paste into Active App"
                        content={item.word}
                        shortcut={{ modifiers: ['cmd'], key: 'v' }}
                      />
                      {item.definition && (
                        <Action.CopyToClipboard
                          title="Copy Definition"
                          content={`${item.word} (${pos}): ${item.definition}`}
                          shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
                        />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section title="External Links">
                      <Action.OpenInBrowser
                        title="Search Semantic Context on Google"
                        url={`https://www.google.com/search?q=${encodeURIComponent(item.word + ' meaning')}`}
                        shortcut={{ modifiers: ['cmd'], key: 'o' }}
                      />
                      <Action.OpenInBrowser
                        title="Open on Oxford Reference"
                        url={`https://www.oxfordreference.com/search?q=${encodeURIComponent(item.word)}`}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
