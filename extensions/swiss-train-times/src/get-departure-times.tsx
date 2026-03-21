import { ActionPanel, List, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { LocationInformationRequest, PlaceResult } from "ojp-sdk-next";
import { ojp } from "./ojp";
import { DepartureTimes } from "./departure-times";
import { getPlaceStops } from "./cache";

function loadTrainStation(searchText: string) {
  if (searchText.length < 3) {
    return getPlaceStops().then((res) => res.reverse());
  }

  const request = LocationInformationRequest.initWithLocationName(searchText);
  request.restrictions = {
    ...request.restrictions,
    includePtModes: false,
    type: ["stop"],
  };

  return ojp.fetchPlaceResults(request);
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = usePromise(loadTrainStation, [searchText]);

  const title = searchText.length < 3 ? "Recent" : "Results";

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search station..." throttle>
      <List.Section title={title} subtitle={data?.length + ""}>
        {data?.map((searchResult) => <SearchListItem key={searchResult.place.name.text} searchResult={searchResult} />)}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: PlaceResult }) {
  const name = searchResult.place.stopPlace?.stopPlaceName?.text ?? "na";
  return (
    <List.Item
      title={searchResult.place.stopPlace?.stopPlaceName?.text ?? "na"}
      actions={
        <ActionPanel>
          <Action.Push title={name} target={<DepartureTimes place={searchResult} />} />
        </ActionPanel>
      }
    />
  );
}
