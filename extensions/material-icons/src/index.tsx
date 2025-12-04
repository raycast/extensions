import { getPreferenceValues } from "@raycast/api";
import GridView from "./grid";
import ListView from "./list";

export default function Command() {
  const { view } = getPreferenceValues<Preferences>();

  return (
    <>
      {view === "grid" && <GridView />}
      {view === "list" && <ListView />}
    </>
  );
}
