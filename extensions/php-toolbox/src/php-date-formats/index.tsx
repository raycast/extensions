import data, { FormatItem } from "./data";
import { useFavorites } from "./favorites";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import format from "./format";

export default function PhpDatePicker() {
  const [favorites, addFavorite, removeFavorite] = useFavorites();
  const [searchText, setSearchText] = useState<string>("");

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a PHP date format…"
    >
      <InputSection input={searchText} onAddFavorite={async () => await addFavorite(searchText)} />

      <FavoritesSection favorites={favorites} removeFavorite={removeFavorite} />

      {data.map(({ section, items }) => (
        <DataSection
          key={section}
          prefix={searchText}
          section={section}
          items={items}
          onAction={(value) => setSearchText(value)}
          onClear={() => setSearchText("")}
        />
      ))}
    </List>
  );
}

function InputSection({ input, onAddFavorite }: { input: string; onAddFavorite: () => void }) {
  if ("" === input) {
    return null;
  }

  return (
    <List.Section title={`Your Input`}>
      <List.Item
        title={input}
        accessories={[{ text: `“${format(input)}”` }, { icon: Icon.Clipboard }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title={`Copy “${input}” to Clipboard`} content={`${input}`} icon={Icon.Clipboard} />
            <Action title={`Add “${input}” to Favorites`} onAction={onAddFavorite} icon={Icon.Plus} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

function FavoritesSection({
  favorites,
  removeFavorite,
}: {
  favorites: string[];
  removeFavorite: (favorite: string) => Promise<void>;
}) {
  if (!favorites.length) {
    return null;
  }

  return (
    <List.Section title={`Your Favorites`}>
      {favorites.map((favorite) => {
        return (
          <List.Item
            key={favorite}
            title={favorite}
            accessories={[{ text: `“${format(favorite)}”` }, { icon: Icon.Clipboard }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title={`Copy “${favorite}” to Clipboard`}
                  content={`${favorite}`}
                  icon={Icon.Clipboard}
                />
                <Action
                  title={`Remove “${favorite}” from Favorites`}
                  onAction={async () => await removeFavorite(favorite)}
                  icon={Icon.Trash}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

function DataSection({
  prefix,
  section,
  items,
  onAction,
  onClear,
}: {
  prefix: string;
  section: string;
  items: FormatItem[];
  onAction: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <List.Section title={section} key={section}>
      {items.map((item) => {
        const { character, description, example } = item;
        return (
          <List.Item
            key={character}
            title={character}
            subtitle={description}
            keywords={[...description.split(" "), example, section]}
            accessories={example.length ? [{ text: `“${example}”` }] : []}
            actions={
              <ActionPanel>
                <Action
                  title={`Add “${character}” to Input`}
                  onAction={() => onAction(`${prefix}${character}`)}
                  icon={Icon.TextInput}
                />
                {"" !== prefix && (
                  <Action.CopyToClipboard
                    title={`Copy “${prefix}${character}” to Clipboard`}
                    content={`${prefix}${character}`}
                    icon={Icon.Clipboard}
                  />
                )}
                {"" !== prefix && <Action title="Clear Input" onAction={onClear} icon={Icon.Undo} />}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
