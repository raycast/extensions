import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types/preferences";
import { QueryWorldListLayout } from "./components/query-world-list-layout";
import { QueryWorldGridLayout } from "./components/query-world-grid-layout";

export default function QueryWorldTime() {
  const { itemLayout } = getPreferenceValues<Preferences>();

  return itemLayout === "List" ? <QueryWorldListLayout /> : <QueryWorldGridLayout />;
}
