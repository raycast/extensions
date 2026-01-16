import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import path from "path";
import { Favorite, useFavorites } from "./hooks";
import { BASE_URL } from "../config";

export function Favorites() {
  const { favorites, isLoading } = useFavorites();

  return (
    <List isLoading={isLoading}>
      <List.Section title="Favorites" subtitle={String(favorites.length)}>
        {favorites.map((result) => (
          <Item key={result.fullpath} result={result} />
        ))}
      </List.Section>
    </List>
  );
}

function Item({ result }: { result: Favorite }) {
  const url = path.extname(result.filename)
    ? `${BASE_URL}/apps/files/?dir=${encodeURI(result.dirname)}&view=files`
    : `${BASE_URL}/apps/files/?dir=${encodeURI(result.fullpath)}&view=files`;

  return (
    <List.Item
      title={result.filename}
      accessories={[{ text: result.dirname }]}
      icon={{ source: Icon.Star, tintColor: Color.Orange }}
      actions={
        <ActionPanel title={result.filename}>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
