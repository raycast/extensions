import { useState } from "react";
import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { searchCountries } from "./utils/phone";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const results = searchCountries(searchText);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by country name or dial code (e.g. france, +33, 1)"
      filtering={false}
      navigationTitle="Look Up Country Code"
    >
      {results.length > 0 ? (
        results.map(({ key, info }) => (
          <List.Item
            key={key}
            title={`${info.flag}  ${info.name}`}
            accessories={[{ icon: Icon.Phone, text: info.dialCode }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Dial Code" content={info.dialCode} />
                <Action.CopyToClipboard title="Copy Country Name" content={info.name} />
                <Action.CopyToClipboard title="Copy Flag" content={info.flag} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={Icon.Phone}
          title="No Countries Found"
          description="Try searching by country name or dial code"
        />
      )}
    </List>
  );
}
