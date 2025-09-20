import { useState } from "react";
import { List, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getData } from "@/api";
import CountryListItem from "@/components/CountryListItem";

export default function Command() {
  const { data, error, isLoading } = getData();
  const preferences = getPreferenceValues<Preferences>();
  const [showMarkdown, setShowMarkdown] = useState<boolean>(preferences.showCoatOfArms);

  if (error) {
    showFailureToast(error, {
      message: "Failed to load countries",
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for name, country code, capital or dialup code"
      isShowingDetail
    >
      <List.EmptyView icon={{ source: "noview.png" }} title="No Results" />
      {data.map((entry) => (
        <CountryListItem
          key={entry.cca2}
          country={entry}
          countries={data}
          showMarkdown={showMarkdown}
          toggleMarkdown={() => setShowMarkdown((s) => !s)}
        />
      ))}
    </List>
  );
}
