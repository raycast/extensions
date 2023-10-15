import { getPreferenceValues } from "@raycast/api";
import SearchAnimeList from "../components/searchAnimeList";
import SearchAnimeGrid from "../components/searchAnimeGrid";

export default function Index() {
  const preferences = getPreferenceValues();
  const chosenView = preferences.view;
  if (chosenView === "grid") return <SearchAnimeGrid />;
  else return <SearchAnimeList />;
}
