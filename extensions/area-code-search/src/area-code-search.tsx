import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import areaCodes from "./area-codes-us.json";

interface AreaCodeData {
  "area-code": number;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

export default function AreaCodeSearch() {
  const [searchText, setSearchText] = useState("");

  const filteredAreaCodes = areaCodes.filter((entry: AreaCodeData) =>
    entry["area-code"].toString().startsWith(searchText),
  );

  return (
    <List searchBarPlaceholder="Enter a 3-digit area code..." onSearchTextChange={setSearchText} throttle>
      {searchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Area Codes"
          description="Type at least one digit to search for area codes"
        />
      ) : filteredAreaCodes.length === 0 ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No Results"
          description={`No area codes found starting with "${searchText}"`}
        />
      ) : (
        filteredAreaCodes.map((entry: AreaCodeData) => (
          <List.Item
            key={`${entry["area-code"]}-${entry.city}`}
            title={entry.city}
            subtitle={entry.state}
            accessories={[{ text: entry["area-code"].toString() }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Location" content={`${entry.city}, ${entry.state}`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
