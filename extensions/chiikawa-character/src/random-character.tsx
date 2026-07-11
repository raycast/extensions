import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CharacterDetail } from "./components/CharacterDetail";
import { CATEGORY_LABELS, CHARACTERS } from "./data/characters";
import { CharacterCategory, ChiikawaCharacter } from "./types/character";

type CategoryFilter = "all" | CharacterCategory;

const RECENTLY_SEEN_LIMIT = 4;
const RECENTLY_SEEN_KEY = "chiikawa-recently-seen-character-ids";

const CATEGORY_FILTER_OPTIONS: Array<{ value: CategoryFilter; title: string }> = [
  { value: "all", title: "All Categories" },
  { value: "main", title: "Main Trio" },
  { value: "friends", title: "Friends" },
  { value: "yoroi-san", title: "Yoroi-san" },
];

function pickRandomCharacter(pool: ChiikawaCharacter[], excludedIds?: Set<string>): ChiikawaCharacter | undefined {
  const filteredPool = excludedIds ? pool.filter((character) => !excludedIds.has(character.id)) : pool;
  const effectivePool = filteredPool.length > 0 ? filteredPool : pool;
  if (effectivePool.length === 0) {
    return undefined;
  }
  return effectivePool[Math.floor(Math.random() * effectivePool.length)];
}

function getNextRecentlySeenIds(current: string[], nextId: string): string[] {
  return [nextId, ...current.filter((id) => id !== nextId)].slice(0, RECENTLY_SEEN_LIMIT);
}

export default function RandomCharacterCommand() {
  const { push } = useNavigation();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [excludeRecentlySeen, setExcludeRecentlySeen] = useState(true);
  const [rollSeed, setRollSeed] = useState(0);
  const [didAutoOpenDetail, setDidAutoOpenDetail] = useState(false);
  const {
    value: recentlySeenIds = [],
    setValue: setRecentlySeenIds,
    isLoading,
  } = useLocalStorage<string[]>(RECENTLY_SEEN_KEY, []);

  const pool = useMemo(
    () => (category === "all" ? CHARACTERS : CHARACTERS.filter((character) => character.category === category)),
    [category],
  );

  const randomCharacter = useMemo(
    () => pickRandomCharacter(pool, excludeRecentlySeen ? new Set(recentlySeenIds) : undefined),
    [pool, excludeRecentlySeen, recentlySeenIds, rollSeed],
  );

  const openCharacterDetail = useCallback(async () => {
    if (!randomCharacter) {
      return;
    }

    await setRecentlySeenIds(getNextRecentlySeenIds(recentlySeenIds, randomCharacter.id));
    push(<CharacterDetail character={randomCharacter} />);
  }, [push, randomCharacter, recentlySeenIds, setRecentlySeenIds]);

  useEffect(() => {
    if (isLoading || !randomCharacter || didAutoOpenDetail) {
      return;
    }

    setDidAutoOpenDetail(true);
    void openCharacterDetail();
  }, [didAutoOpenDetail, isLoading, openCharacterDetail, randomCharacter]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Pick a random Chiikawa character..."
      searchBarAccessory={
        <List.Dropdown tooltip="Category" value={category} onChange={(value) => setCategory(value as CategoryFilter)}>
          {CATEGORY_FILTER_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </List.Dropdown>
      }
    >
      {randomCharacter ? (
        <List.Item
          icon={randomCharacter.icon}
          title={randomCharacter.nameEn}
          subtitle={randomCharacter.nameJp}
          accessories={[
            { icon: Icon.Tag, text: CATEGORY_LABELS[randomCharacter.category] },
            { icon: Icon.Clock, text: `${recentlySeenIds.length}/${RECENTLY_SEEN_LIMIT} recent` },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action icon={Icon.Eye} title="Open Character Detail" onAction={openCharacterDetail} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Randomizer">
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Pick Another Character"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => setRollSeed((seed) => seed + 1)}
                />
                <Action
                  icon={excludeRecentlySeen ? Icon.MinusCircle : Icon.PlusCircle}
                  title={excludeRecentlySeen ? "Include Recently Seen" : "Exclude Recently Seen"}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onAction={() => setExcludeRecentlySeen((value) => !value)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Characters Available"
          description="Try another category to continue."
        />
      )}
    </List>
  );
}
