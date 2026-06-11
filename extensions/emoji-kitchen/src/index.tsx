import { ActionPanel, Action, Grid, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useMemo, useState, useCallback } from "react";
import { useCachedPromise } from "@raycast/utils";
import { EmojiWithUnicode, Combinations } from "./types";
import { CATEGORY_ORDER, GLOBAL_SYNONYMS } from "./constants";
import {
  loadEmojiIndex,
  loadCombinations,
  getGStaticUrl,
  loadEmojiVectors,
  getQueryVector,
  formatEmojiName,
  scoreEmojiSearchMatch,
} from "./utils";
import { ResultView } from "./components/ResultView";
import { MashupGrid } from "./components/MashupGrid";

export default function Command() {
  const { push } = useNavigation();
  const [selectedEmoji1, setSelectedEmoji1] = useState<string | null>(null);
  const [mode, setMode] = useState<"combine" | "explore">("explore");
  const [searchText, setSearchText] = useState("");

  const { data: index, isLoading: isLoadingIndex } = useCachedPromise(async () => {
    return loadEmojiIndex();
  });

  const { data: vectors, isLoading: isLoadingVectors } = useCachedPromise(async () => {
    return loadEmojiVectors();
  });

  const isLoading = isLoadingIndex || isLoadingVectors;

  const emojiList = useMemo(() => {
    if (!index) return [];
    const synonymsEntries = Object.entries(GLOBAL_SYNONYMS);

    return Object.entries(index).map(([u, info]) => {
      const extraKeywords = new Set<string>();
      const baseKeywords = info.k || [];

      // Add synonyms if any base keyword matches a synonym category
      synonymsEntries.forEach(([key, values]) => {
        if (values.some((v) => baseKeywords.includes(v)) || baseKeywords.includes(key)) {
          extraKeywords.add(key);
          values.forEach((v) => extraKeywords.add(v));
        }
      });

      return {
        unicode: u,
        ...info,
        k: Array.from(new Set([...baseKeywords, ...Array.from(extraKeywords)])),
      };
    });
  }, [index]);

  const searchResults = useMemo(() => {
    const trimmed = searchText.trim();
    if (!trimmed) return null;

    const query = trimmed.toLowerCase();
    const queryVec = getQueryVector(query);
    const vecMap = vectors ?? {};

    return emojiList
      .map((item) => ({
        ...item,
        score: scoreEmojiSearchMatch(item, item.unicode, query, queryVec, vecMap),
      }))
      .filter((item) => item.score >= 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }, [emojiList, searchText, vectors]);

  /** Raycast still hides non-matching items / shows EmptyView even when filtering={false}; include the query so custom search results stay visible. */
  const searchBarMatchKeywords = searchText.trim() ? [searchText.trim(), searchText.trim().toLowerCase()] : [];

  const categories = useMemo(() => {
    if (!emojiList.length || searchResults !== null) return [];
    const cats: Record<string, typeof emojiList> = {};
    emojiList.forEach((item) => {
      const cat = item.c || "other";
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(item);
    });

    return Object.entries(cats)
      .sort(([a], [b]) => {
        const indexA = CATEGORY_ORDER.indexOf(a.toLowerCase());
        const indexB = CATEGORY_ORDER.indexOf(b.toLowerCase());

        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      })
      .map(([cat, items]) => {
        return [cat, items.sort((a, b) => a.o - b.o)] as const;
      });
  }, [emojiList, searchResults]);

  const handleSelectEmoji = useCallback(
    (item: EmojiWithUnicode) => {
      if (!index) return;

      if (mode === "explore") {
        push(<MashupGrid baseEmoji={item} index={index} />);
      } else {
        if (!selectedEmoji1) {
          setSelectedEmoji1(item.unicode);
          showToast({
            title: `Selected ${item.e}`,
            message: "Now select another emoji to combine",
            style: Toast.Style.Success,
          });
        } else {
          const emoji1Combs = loadCombinations(selectedEmoji1);
          const comboStr = emoji1Combs[item.unicode];

          if (comboStr) {
            const [date, left] = comboStr.split("/");
            const right = left === item.unicode ? selectedEmoji1 : item.unicode;
            const url = getGStaticUrl(left, right, date);

            push(
              <ResultView
                url={url}
                e1={index[selectedEmoji1].e}
                e2={item.e}
                filename={`${index[selectedEmoji1].a}_${item.a}_mashup`}
                onReset={() => setSelectedEmoji1(null)}
              />,
            );
          } else {
            showToast({
              title: "No combination found",
              message: `Sorry, ${index[selectedEmoji1].e} and ${item.e} can't be combined yet.`,
              style: Toast.Style.Failure,
            });
            setSelectedEmoji1(null);
          }
        }
      }
    },
    [index, mode, selectedEmoji1, push],
  );

  const handleRandomize = useCallback(() => {
    if (!index) return;
    const keys = Object.keys(index);
    let randomKey1: string;
    let emoji1Combs: Combinations;
    let combKeys: string[];

    // Retry until we find an emoji with at least one combination
    let attempts = 0;
    do {
      randomKey1 = keys[Math.floor(Math.random() * keys.length)];
      emoji1Combs = loadCombinations(randomKey1);
      combKeys = Object.keys(emoji1Combs);
      attempts++;
    } while (combKeys.length === 0 && attempts < 20);

    if (combKeys.length === 0) {
      showToast({
        title: "Randomize failed",
        message: "Could not find a valid combination. Please try again.",
        style: Toast.Style.Failure,
      });
      return;
    }

    const randomKey2 = combKeys[Math.floor(Math.random() * combKeys.length)];
    const comboStr = emoji1Combs[randomKey2];

    const [date, left] = comboStr.split("/");
    const right = left === randomKey2 ? randomKey1 : randomKey2;
    const url = getGStaticUrl(left, right, date);

    push(
      <ResultView
        url={url}
        e1={index[randomKey1].e}
        e2={index[randomKey2].e}
        filename={`${index[randomKey1].a}_${index[randomKey2].a}_mashup`}
        onReset={() => setSelectedEmoji1(null)}
      />,
    );
  }, [index, push]);

  const queryLower = searchText.trim().toLowerCase();

  return (
    <Grid
      columns={8}
      isLoading={isLoading}
      inset={Grid.Inset.Small}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search emoji to cook..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Mode"
          storeValue={true}
          onChange={(newValue) => {
            setMode((prev) => {
              if (prev !== newValue) setSelectedEmoji1(null);
              return newValue as "combine" | "explore";
            });
          }}
        >
          <Grid.Dropdown.Item title="Explore Mashups" value="explore" icon={Icon.MagnifyingGlass} />
          <Grid.Dropdown.Item title="Combine Emojis" value="combine" icon={Icon.PlusCircle} />
        </Grid.Dropdown>
      }
    >
      {selectedEmoji1 && index && (
        <Grid.Section title="Current Selection">
          <Grid.Item
            key="selected"
            content={index[selectedEmoji1].e}
            title="Selected"
            keywords={searchBarMatchKeywords.length > 0 ? searchBarMatchKeywords : undefined}
            actions={
              <ActionPanel>
                <Action title="Clear Selection" onAction={() => setSelectedEmoji1(null)} icon={Icon.XMarkCircle} />
              </ActionPanel>
            }
          />
        </Grid.Section>
      )}

      {searchResults !== null && searchResults.length > 0 ? (
        <Grid.Section title="Search Results">
          {searchResults.map((item) => (
            <Grid.Item
              key={item.unicode}
              content={item.e}
              title={formatEmojiName(item.a)}
              keywords={Array.from(
                new Set([...searchBarMatchKeywords, queryLower, item.a, formatEmojiName(item.a), ...item.k]),
              )}
              actions={
                <ActionPanel>
                  <Action
                    title={mode === "combine" ? "Combine" : "Explore"}
                    icon={Icon.MagnifyingGlass}
                    onAction={() => handleSelectEmoji(item)}
                  />
                  <Action
                    title="Randomize"
                    onAction={handleRandomize}
                    icon={Icon.Wand}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  {selectedEmoji1 && (
                    <Action title="Clear Selection" onAction={() => setSelectedEmoji1(null)} icon={Icon.XMarkCircle} />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ) : searchResults !== null && searchResults.length === 0 ? (
        <Grid.EmptyView title="No matching emojis" description="Try different words or clear the search bar." />
      ) : searchResults === null ? (
        categories.map(([cat, items]) => (
          <Grid.Section key={cat} title={cat.toUpperCase()}>
            {items.map((item) => (
              <Grid.Item
                key={item.unicode}
                content={item.e}
                title={formatEmojiName(item.a)}
                keywords={item.k}
                actions={
                  <ActionPanel>
                    <Action
                      title={mode === "combine" ? "Combine" : "Explore"}
                      icon={mode === "combine" ? Icon.Plus : Icon.Compass}
                      onAction={() => handleSelectEmoji(item)}
                    />
                    <Action
                      title="Randomize"
                      onAction={handleRandomize}
                      icon={Icon.Wand}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    {selectedEmoji1 && (
                      <Action
                        title="Clear Selection"
                        onAction={() => setSelectedEmoji1(null)}
                        icon={Icon.XMarkCircle}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
        ))
      ) : null}
    </Grid>
  );
}
