import { getPreferenceValues } from "@raycast/api";
import { ManageWatchList } from "./components/manage-watchlist/manageWatchList";
import { ManageWatchGrid } from "./components/manage-watchlist/manageWatchGrid";

export default function Index() {
  const preferences = getPreferenceValues();
  const chosenView = preferences.view;
  if (chosenView === "grid") return <ManageWatchGrid />;
  else return <ManageWatchList />;
}
