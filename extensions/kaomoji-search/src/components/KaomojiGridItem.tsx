import { Grid } from "@raycast/api";
import { KaomojiActions } from "./KaomojiActions";
import { getBase64SvgUrl } from "../utils/svg";
import { SearchResult } from "../types";

interface KaomojiGridItemProps {
  searchResult: SearchResult;
  primaryAction: Preferences["primaryAction"];
  toggleFavorite: (kaomoji: SearchResult) => void;
  isFavorite: (kaomoji: SearchResult) => boolean;
}

export function KaomojiGridItem({ searchResult, primaryAction, toggleFavorite, isFavorite }: KaomojiGridItemProps) {
  return (
    <Grid.Item
      content={{
        source: {
          dark: getBase64SvgUrl(searchResult.name, true),
          light: getBase64SvgUrl(searchResult.name, false),
        },
      }}
      title={searchResult.description}
      actions={
        <KaomojiActions
          searchResult={searchResult}
          primaryAction={primaryAction}
          toggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
        />
      }
    />
  );
}
