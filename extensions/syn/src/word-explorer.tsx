import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchDatamuseData, CATEGORIES, DatamuseResult } from "./api/datamuse";

const ALL = "All";

const CATEGORY_ICONS: Record<string, Icon> = {
  Similars: Icon.Switch,
  Synonyms: Icon.CheckCircle,
  Antonyms: Icon.Contrast,
  Evocative: Icon.LightBulb,
  "Sounds Like": Icon.SpeakerHigh,
  "Similar Spelling": Icon.Pencil,
  Rhymes: Icon.Music,
  "Adjectives for word": Icon.Tag,
  "Nouns for word": Icon.Lowercase,
  Suggestions: Icon.Stars,
};

function WordExplorerList({ initialWord }: { initialWord?: string }) {
  const [searchText, setSearchText] = useState(initialWord ?? "");
  const [category, setCategory] = useState(ALL);

  const filter = category === ALL ? undefined : category;

  const { isLoading, data } = useCachedPromise(
    (word: string, cat: string | undefined) => fetchDatamuseData(word, cat),
    [searchText, filter],
    {
      execute: searchText.length > 0,
      keepPreviousData: true,
    },
  );

  const results = data ?? [];

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Explore a word (e.g. ocean or ocean:nature)"
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Category" storeValue onChange={setCategory}>
          <List.Dropdown.Item title="All" value={ALL} icon={Icon.BulletPoints} />
          <List.Dropdown.Section title="Categories">
            {Object.keys(CATEGORIES).map((cat) => (
              <List.Dropdown.Item key={cat} title={cat} value={cat} icon={CATEGORY_ICONS[cat] ?? Icon.Dot} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {results.map((group: DatamuseResult, index: number) => (
        <List.Section key={index} title={group.category} subtitle={`${group.items.length} words`}>
          {group.items.map((word, wIndex) => (
            <List.Item
              key={wIndex}
              title={word}
              icon={CATEGORY_ICONS[group.category] ?? Icon.Dot}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Explore Word"
                    icon={Icon.MagnifyingGlass}
                    target={<WordExplorerList initialWord={word} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Word"
                    content={word}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action.Paste title="Paste Word" content={word} shortcut={{ modifiers: ["opt"], key: "return" }} />
                  <Action.CopyToClipboard
                    title="Copy All in Category"
                    content={group.items.join(", ")}
                    shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.WordExplorer }>) {
  const initialWord = props.arguments.word || props.fallbackText || undefined;
  return <WordExplorerList initialWord={initialWord} />;
}
