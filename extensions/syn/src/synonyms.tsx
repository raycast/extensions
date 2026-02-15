import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchThesaurusData, Definition, SynonymItem } from "./api/thesaurus";

function similarityColor(similarity: string): Color {
  switch (similarity) {
    case "100":
      return Color.Yellow;
    case "50":
      return Color.Green;
    case "10":
      return Color.Blue;
    case "-10":
      return Color.SecondaryText;
    case "-50":
      return Color.Orange;
    case "-100":
      return Color.Red;
    default:
      return Color.PrimaryText;
  }
}

function WordDetailList({ word, definition }: { word: string; definition: Definition }) {
  return (
    <List navigationTitle={word}>
      <List.Section title="Synonyms" subtitle={`${definition.synonyms.length} words`}>
        {definition.synonyms.map((s: SynonymItem, i: number) => (
          <List.Item
            key={i}
            title={s.term}
            icon={{ source: Icon.Circle, tintColor: similarityColor(s.similarity) }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Look up"
                  icon={Icon.MagnifyingGlass}
                  target={<SynonymsList initialWord={s.term} />}
                />
                <Action.CopyToClipboard
                  title="Copy Word"
                  content={s.term}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action.Paste title="Paste Word" content={s.term} shortcut={{ modifiers: ["opt"], key: "return" }} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Antonyms" subtitle={`${definition.antonyms.length} words`}>
        {definition.antonyms.map((s: SynonymItem, i: number) => (
          <List.Item
            key={i}
            title={s.term}
            icon={{ source: Icon.Circle, tintColor: similarityColor(s.similarity) }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Look up"
                  icon={Icon.MagnifyingGlass}
                  target={<SynonymsList initialWord={s.term} />}
                />
                <Action.CopyToClipboard
                  title="Copy Word"
                  content={s.term}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action.Paste title="Paste Word" content={s.term} shortcut={{ modifiers: ["opt"], key: "return" }} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function SynonymsList({ initialWord }: { initialWord: string }) {
  const [searchText, setSearchText] = useState(initialWord);

  const { isLoading, data } = useCachedPromise(fetchThesaurusData, [searchText], {
    execute: searchText.length > 0,
    keepPreviousData: true,
  });

  const definitions = data ?? [];

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a word (e.g. happy)"
      throttle
      isShowingDetail={definitions.length > 0}
    >
      {definitions.map((def, index) => (
        <List.Item
          key={index}
          title={def.definition}
          subtitle={def.pos}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Part of Speech" text={def.pos} />
                  <List.Item.Detail.Metadata.Label title="Definition" text={def.definition} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Synonyms">
                    {def.synonyms.length > 0 ? (
                      def.synonyms.map((s: SynonymItem, i: number) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={i}
                          text={s.term}
                          color={similarityColor(s.similarity)}
                        />
                      ))
                    ) : (
                      <List.Item.Detail.Metadata.TagList.Item text="None" color={Color.SecondaryText} />
                    )}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Antonyms">
                    {def.antonyms.length > 0 ? (
                      def.antonyms.map((s: SynonymItem, i: number) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={i}
                          text={s.term}
                          color={similarityColor(s.similarity)}
                        />
                      ))
                    ) : (
                      <List.Item.Detail.Metadata.TagList.Item text="None" color={Color.SecondaryText} />
                    )}
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse Words"
                icon={Icon.List}
                target={<WordDetailList word={searchText} definition={def} />}
              />
              <Action.CopyToClipboard
                title="Copy Synonyms"
                content={def.synonyms.map((s: SynonymItem) => s.term).join(", ")}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.CopyToClipboard
                title="Copy Antonyms"
                content={def.antonyms.map((s: SynonymItem) => s.term).join(", ")}
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Definition"
                content={def.definition}
                shortcut={{ modifiers: ["opt"], key: "c" }}
              />
              <Action.OpenInBrowser
                url={`https://www.thesaurus.com/browse/${searchText}`}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Synonyms }>) {
  const initialWord = props.arguments.word || props.fallbackText || "";
  return <SynonymsList initialWord={initialWord} />;
}
