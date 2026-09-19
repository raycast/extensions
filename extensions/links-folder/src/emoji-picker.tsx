import { useState } from "react";
import { Action, ActionPanel, Grid, Icon, useNavigation } from "@raycast/api";
import emojis from "emojibase-data/en/compact.json";
import messages from "emojibase-data/en/messages.json";
import { rankByQuery } from "./search";

// The macOS emoji picker is a separate window, so opening it makes Raycast lose focus and close the
// extension. This picker lives inside the extension instead, on top of the form that opened it.

type PickerEmoji = { emoji: string; label: string; tags: string[]; group: number };

const COMPONENT_GROUP = 2; // skin tones, hair styles: not useful as icons on their own
const MAX_SEARCH_RESULTS = 240;

const pickerEmojis: PickerEmoji[] = emojis
  .filter((e) => e.group !== undefined && e.group !== COMPONENT_GROUP)
  .map((e) => ({ emoji: e.unicode, label: e.label, tags: e.tags ?? [], group: e.group as number }));

const groupTitles = new Map(
  messages.groups.map((g) => [g.order, g.message.replace(/\b\w/g, (char) => char.toUpperCase())]),
);

const visibleGroups = [...groupTitles.entries()].filter(([order]) => order !== COMPONENT_GROUP);

function searchEmojis(query: string): PickerEmoji[] {
  return rankByQuery(pickerEmojis, query, (e) => ({ primary: e.label, secondary: e.tags.join(" ") })).slice(
    0,
    MAX_SEARCH_RESULTS,
  );
}

function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const isSearching = searchText.trim().length > 0;

  function renderItem(item: PickerEmoji) {
    return (
      <Grid.Item
        key={item.emoji}
        id={item.emoji}
        content={item.emoji}
        title={item.label}
        actions={
          <ActionPanel>
            <Action
              title="Use Emoji"
              icon={Icon.Check}
              onAction={() => {
                onSelect(item.emoji);
                pop();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const results = isSearching ? searchEmojis(searchText) : [];

  // Raycast keeps the highlighted item while it is still in the results, so select the best match explicitly
  function handleSearchTextChange(text: string) {
    setSearchText(text);
    if (text.trim()) {
      setSelectedId(searchEmojis(text)[0]?.emoji);
    } else {
      setSelectedId(pickerEmojis.find((e) => e.group === visibleGroups[0][0])?.emoji);
    }
  }

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Small}
      navigationTitle="Choose Emoji"
      searchBarPlaceholder="Search emoji (e.g. book, heart, school)…"
      filtering={false}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      {isSearching ? (
        results.length > 0 ? (
          results.map(renderItem)
        ) : (
          <Grid.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No emoji found"
            description={`Nothing matches "${searchText.trim()}".`}
          />
        )
      ) : (
        visibleGroups.map(([order, title]) => (
          <Grid.Section key={order} title={title}>
            {pickerEmojis.filter((e) => e.group === order).map(renderItem)}
          </Grid.Section>
        ))
      )}
    </Grid>
  );
}

// Drop-in replacement for the old "Open OS Emoji Picker" action in the create/edit forms.
export function EmojiPickerActions({ icon, onChange }: { icon: string; onChange: (emoji: string) => void }) {
  return (
    <>
      <Action.Push
        title="Choose Emoji"
        icon={Icon.Emoji}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        target={<EmojiPicker onSelect={onChange} />}
      />
      {icon.trim() !== "" && (
        <Action
          title="Clear Icon"
          icon={Icon.XMarkCircle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          onAction={() => onChange("")}
        />
      )}
    </>
  );
}
