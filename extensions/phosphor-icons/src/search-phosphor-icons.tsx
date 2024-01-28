import { getPreferenceValues } from "@raycast/api";
import IconGrid from "./components/IconGrid";
import IconList from "./components/IconList";

export default function Command() {
  const preferences = getPreferenceValues();

  if (preferences["view"] === "list") {
    return <IconList />;
  }

  return <IconGrid columns={parseInt(preferences["grid-columns"])} />;
}
