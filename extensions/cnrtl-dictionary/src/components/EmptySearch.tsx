import { List, Icon } from "@raycast/api";

interface EmptySearchProps {
  title?: string;
  description?: string;
  recentWords?: string[];
  onSelectWord?: (word: string) => void;
}

/**
 * Shown before the user types anything.
 * If recent words are available, they are listed as quick picks.
 */
export function EmptySearch({
  title = "Rechercher un mot",
  description = "Tapez un mot français pour lancer la recherche sur le CNRTL.",
  recentWords = [],
  onSelectWord,
}: EmptySearchProps): JSX.Element {
  if (recentWords.length === 0) {
    return <List.EmptyView icon={{ source: Icon.MagnifyingGlass }} title={title} description={description} />;
  }

  return (
    <>
      <List.Section title="Recherches récentes">
        {recentWords.map((word) => (
          <List.Item
            key={word}
            icon={Icon.Clock}
            title={word}
            actions={onSelectWord ? <List.Item.Detail /> : undefined}
          />
        ))}
      </List.Section>
    </>
  );
}
