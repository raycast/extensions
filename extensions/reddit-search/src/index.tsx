import useFavoriteSubreddits from "./FavoriteSubreddits";
import Home from "./Home";

export default function Command() {
  const [favorites, addSubreddit, removeSubreddit] = useFavoriteSubreddits();

  return <Home favorites={favorites} addFavoriteSubreddit={addSubreddit} removeFavoriteSubreddit={removeSubreddit} />;
}
