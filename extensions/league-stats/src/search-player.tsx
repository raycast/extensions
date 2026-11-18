import { LaunchProps, List } from "@raycast/api";
import { pickFavorite, targetOf } from "./favorites";
import { useFavorites } from "./hooks";
import { PlayerView } from "./player-view";
import { parseRiotId } from "./riotid";
import { SearchList } from "./search-list";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchPlayer }>) {
  // The text comes from the command's argument (typed after the command name or its alias in Raycast's root search),
  // or from the root search bar itself when the command is used as a fallback command.
  const text = (props.arguments.riotId || props.fallbackText || "").trim();
  const target = parseRiotId(text);

  // A complete Riot ID goes straight to the player page.
  if (target) return <PlayerView target={target} root />;
  return text ? <FavoriteOrSearch text={text} /> : <SearchList initialText="" />;
}

/**
 * A name typed without a tag cannot be looked up, but it can be a favorite: if it clearly means one, open that
 * player at once. Otherwise show the list with what was typed, so the choice is one keypress away.
 */
function FavoriteOrSearch({ text }: { text: string }) {
  const favorites = useFavorites();
  if (!favorites) return <List isLoading />;

  const favorite = pickFavorite(favorites, text);
  return favorite ? <PlayerView target={targetOf(favorite)} root /> : <SearchList initialText={text} />;
}
