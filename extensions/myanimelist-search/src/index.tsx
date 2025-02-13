import { getPreferenceValues } from "@raycast/api";
import SearchAnimeList from "./components/index/searchAnimeList";
import SearchAnimeGrid from "./components/index/searchAnimeGrid";

export default function Index() {
  const preferences = getPreferenceValues();
  const chosenView = preferences.view;
  if (chosenView === "grid") return <SearchAnimeGrid />;
  else return <SearchAnimeList />;
}
