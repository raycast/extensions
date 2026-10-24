import useFavoriteSubreddits from "./FavoriteSubreddits";
import Home from "./Home";

export default function Command() {
  const [favorites, , removeSubreddit] = useFavoriteSubreddits();

  return <Home favorites={favorites} removeFavoriteSubreddit={removeSubreddit} />;
}
