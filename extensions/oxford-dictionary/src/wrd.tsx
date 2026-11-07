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
import { ReverseSearchResult, ExtensionPreferences } from './types/dictionary';
import { searchReverseDefinitions } from './services/reverse-search-service';
import { speakWord } from './services/pronunciation-service';
import { getPosColor, getPosIcon } from './utils/ui-helpers';
import DefCommand from './def';
import SynonymsCommand from './synonyms';

export type WrdProps = {
  arguments?: { query?: string };
  launchType?: any;
  initialQuery?: string;
  fallbackText?: string;
};

export default function WrdCommand(props?: WrdProps) {
  const initial =
    props?.arguments?.query ||
    props?.fallbackText ||
    props?.initialQuery ||
    '';
  const [searchText, setSearchText] = useState(initial);
  const [isFinalized, setIsFinalized] = useState(!!initial);
  const [results, setResults] = useState<ReverseSearchResult[]>([]);
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
        const hits = await searchReverseDefinitions(q, preferences, 50);
        setResults(hits);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Reverse Search Error',
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

  const allItemIds = results.map((item, idx) => `rev-${item.word}-${idx}`);

  useEffect(() => {
    if (allItemIds.length > 0) {
      if (!selectedItemId || !allItemIds.includes(selectedItemId)) {
        setSelectedItemId(allItemIds[0]);
      }
    } else {
      setSelectedItemId(undefined);
    }
  }, [allItemIds.join(',')]);

  // While typing, spaces are preserved normally (e.g. 'to put forward', 'fear of spiders').
  // After phrase is finalised with Enter, pressing space moves selection down by 1.
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

    // 4. Phrase finalized with Enter, and Space pressed to cycle down
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
      searchBarPlaceholder="Describe what you mean (e.g. 'to put forward', 'fear of spiders', 'study of flags')..."
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id) setSelectedItemId(id);
      }}
    >
      {results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText.trim() ? `No matching words found for "${searchText}"` : 'Reverse Definition Search'}
          description={
            searchText.trim()
              ? 'Try describing the meaning with different words, simpler terms, or root concepts.'
              : 'Find the word on the tip of your tongue by describing its meaning, definition, or concept (e.g. "to put forward" → propose, propound, submit).'
          }
        />
      ) : (
        <List.Section title={`MATCHING WORDS (${results.length} found)`}>
          {results.map((item, idx) => {
            const pos = item.partOfSpeech || 'noun';
            const icon = getPosIcon(pos);
            const color = getPosColor(pos);

            return (
              <List.Item
                key={`rev-${item.word}-${idx}`}
                id={`rev-${item.word}-${idx}`}
                icon={{ source: icon, tintColor: color }}
                title={item.word}
                subtitle={item.definition || `${pos}`}
                accessories={[
                  {
                    tag: {
                      value: pos,
                      color: color,
                    },
                  },
                  {
                    text: navHint,
                  },
                ]}
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
                          title={isFinalized ? "Edit Search Text" : "Finalise Phrase (Space to Browse)"}
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
                        title="Open on OneLook Reverse Dictionary"
                        url={`https://www.onelook.com/reverse-dictionary.shtml?s=${encodeURIComponent(searchText)}`}
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
