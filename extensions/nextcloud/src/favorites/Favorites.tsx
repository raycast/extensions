import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import path from "path";
import { getPreferences } from "../preferences";
import { Favorite, useFavorites } from "./hooks";

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
  const { hostname } = getPreferences();

  const url = path.extname(result.filename)
    ? `https://${hostname}/apps/files/?dir=${encodeURI(result.dirname)}&view=files`
    : `https://${hostname}/apps/files/?dir=${encodeURI(result.fullpath)}&view=files`;

  return (
    <List.Item
      title={result.filename}
      accessoryTitle={result.dirname}
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
