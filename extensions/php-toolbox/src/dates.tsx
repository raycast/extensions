import type { FormatItem } from "./data";
import data, { stackToExample, stackToExampleStrict, stackToTemplate } from "./data";
import type { Favorite } from "./favorites";
import { addFavorite, getFavorites, removeFavorite } from "./favorites";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

export default function PhpDatePicker(props: { stack: FormatItem[] }) {
  const { stack } = props;
  const template = stackToTemplate(stack);
  const example = stackToExample(stack);

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [searchStack, setSearchStack] = useState<{ character: string }[]>([]);
  const [searchFormat, setSearchFormat] = useState<string | false>("");

  const reloadFavorites = () => {
    getFavorites().then((favorites) => setFavorites(favorites));
  };

  useEffect(() => reloadFavorites(), []);
  useEffect(() => {
    const stack = searchText.split("").map((character) => ({ character }));
    setSearchStack(stack);
    setSearchFormat(stackToExampleStrict(stack));
  }, [searchText]);

  return (
    <List enableFiltering={true} searchText={searchText} onSearchTextChange={setSearchText}>
      {`` !== template && (
        <List.Item
          title={template}
          subtitle={example}
          accessories={[{ text: "Copy to Clipboard", icon: Icon.Clipboard }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title={`Copy “${template}” to Clipboard`}
                content={`${template}`}
                icon={Icon.Clipboard}
              />
              <Action
                title={`Add “${template}” to Favorites`}
                icon={Icon.Plus}
                onAction={async () => {
                  await addFavorite(stack);
                  reloadFavorites();
                }}
              />
            </ActionPanel>
          }
        />
      )}

      {false !== searchFormat && searchText.length >= 3 && (
        <List.Item
          title={searchText}
          subtitle={searchFormat}
          accessories={[{ text: "Copy to Clipboard", icon: Icon.Clipboard }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title={`Copy “${searchText}” to Clipboard`}
                content={`${searchText}`}
                icon={Icon.Clipboard}
              />
              <Action
                title={`Add “${searchText}” to Favorites`}
                icon={Icon.Plus}
                onAction={async () => {
                  await addFavorite(searchStack);
                  reloadFavorites();
                }}
              />
            </ActionPanel>
          }
        />
      )}

      {0 === stack.length && favorites.length > 0 && (
        <List.Section title={`Your Favorites`}>
          {favorites.map((favorite) => {
            const template = stackToTemplate(favorite.stack);
            return (
              <List.Item
                key={favorite.id}
                title={template}
                subtitle={stackToExample(favorite.stack)}
                accessories={[{ text: "Copy to Clipboard", icon: Icon.Clipboard }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title={`Copy “${template}” to Clipboard`}
                      content={`${template}`}
                      icon={Icon.Clipboard}
                    />
                    <Action
                      title={`Remove “${template}” from Favorites`}
                      icon={Icon.Trash}
                      onAction={async () => {
                        await removeFavorite(favorite.id);
                        reloadFavorites();
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {data.map(({ section, items }) => (
        <List.Section title={section} key={section}>
          {items.map((item) => {
            const { character, description, example } = item;
            return (
              <List.Item
                key={character}
                title={character}
                subtitle={description}
                keywords={[...description.split(" "), example, section]}
                accessories={example.length ? [{ text: `“${example}”` }, { icon: Icon.Calendar }] : []}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={`Continue with “${template}${character}”…`}
                      target={<PhpDatePicker stack={[...stack, item]} />}
                      icon={Icon.ArrowRight}
                    />
                    <Action.CopyToClipboard
                      title={`Copy “${template}${character}” to Clipboard`}
                      content={`${template}${character}`}
                      icon={Icon.Clipboard}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

PhpDatePicker.defaultProps = { stack: [] };
