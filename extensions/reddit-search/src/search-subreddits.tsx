import useFavoriteSubreddits from "./FavoriteSubreddits";
import SubredditList from "./SubredditList";

export default function Command() {
  const [favorites, addSubreddit, removeSubreddit] = useFavoriteSubreddits();

  return (
    <SubredditList
      favorites={favorites}
      addFavoriteSubreddit={addSubreddit}
      removeFavoriteSubreddit={removeSubreddit}
    />
  );
}
