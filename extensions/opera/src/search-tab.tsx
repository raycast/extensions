import { getPreferenceValues, List } from "@raycast/api";
import { OperaListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<{ useOriginalFavicon: boolean }>();
  const { data, isLoading, errorView } = useTabSearch();

  if (errorView) {
    return errorView;
  }

  return (
    <List isLoading={isLoading}>
      {data?.map((tab) => (
        <OperaListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
      ))}
    </List>
  );
}
