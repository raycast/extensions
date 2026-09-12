import { getPreferenceValues, List } from "@raycast/api";
import { VivaldiListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { Preferences } from "./interfaces";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const { data, isLoading, errorView } = useTabSearch();

  if (errorView) {
    return errorView;
  }

  return (
    <List isLoading={isLoading}>
      {data?.map((tab) => (
        <VivaldiListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
      ))}
    </List>
  );
}
