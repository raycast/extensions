import { List, ActionPanel, Action, Icon, showToast, updateCommandMetadata, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { getModeColor, getModeEmoji } from "./helpers/modes";
import { formatArrival } from "./helpers/format";
import { fetchArrivalData } from "./api/network";
import { loadSelectedItems, saveSelectedItems } from "./helpers/storage";
import { StopPointSearchResponse, MatchedStop, Arrival } from "./models";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedItems, setSelectedItems] = useState<MatchedStop[]>([]);
  const [sortedArrivals, setSortedArrivals] = useState<Arrival[]>([]);
  const { isLoading, data } = useFetch<StopPointSearchResponse>(
    `https://api.tfl.gov.uk/StopPoint/Search/${searchText}?maxResults=15`,
    { execute: !!searchText },
  );

  useEffect(() => {
    loadSelectedItems().then(setSelectedItems);
  }, []);

  useEffect(() => {
    saveSelectedItems(selectedItems);
  }, [selectedItems]);

  const fetchAndSetArrivals = useCallback(async () => {
    const arrivals = await fetchArrivalData(selectedItems);
    const sortedArrivals = arrivals.sort(
      (a, b) => new Date(a.expectedArrival).getTime() - new Date(b.expectedArrival).getTime(),
    );
    setSortedArrivals(sortedArrivals);

    const newSubtitleComponents = sortedArrivals.slice(0, 3).map(formatArrival);
    updateCommandMetadata({ subtitle: newSubtitleComponents.join(" · ") });

    showToast(Toast.Style.Success, "Arrivals Reloaded");
  }, [selectedItems]);

  useEffect(() => {
    fetchAndSetArrivals();
  }, [selectedItems, fetchAndSetArrivals]);

  const handleSelect = (item: MatchedStop) => setSelectedItems((prevSelected) => [...prevSelected, item]);

  const handleDeselect = (item: MatchedStop) =>
    setSelectedItems((prevSelected) => prevSelected.filter((selected) => selected.id !== item.id));

  const renderArrival = (arrival: Arrival) => {
    const expectedArrival = new Date(arrival.expectedArrival);
    const hours = expectedArrival.getHours().toString().padStart(2, "0");
    const minutes = expectedArrival.getMinutes().toString().padStart(2, "0");
    const directionEmoji = arrival.direction === "outbound" ? "OUTBOUND" : "INBOUND";
    const modeEmoji = getModeEmoji(arrival.modeName);
    return (
      <List.Item
        key={arrival.id}
        icon={`${modeEmoji}`}
        title={`${hours}:${minutes} `}
        subtitle={`${arrival.stationName}`}
        accessories={[{ text: `${directionEmoji}` }]}
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      navigationTitle="Search stations"
      searchBarPlaceholder="Search for your station"
      onSearchTextChange={setSearchText}
      throttle
      actions={
        <ActionPanel title="Global Actions">
          <Action title="Reload" onAction={fetchAndSetArrivals} />
        </ActionPanel>
      }
    >
      {sortedArrivals.length > 0 && (
        <List.Section title="Next arrivals">{sortedArrivals.slice(0, 5).map(renderArrival)}</List.Section>
      )}
      {selectedItems.length > 0 && (
        <List.Section title="Selected stops">
          {selectedItems.map((item) => (
            <List.Item
              key={item.id}
              title={item.name}
              accessories={[
                { icon: Icon.Checkmark },
                ...item.modes.map((mode) => ({ tag: { value: mode, color: getModeColor(mode) } })),
              ]}
              actions={
                <ActionPanel>
                  <Action title="Deselect" onAction={() => handleDeselect(item)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Results">
        {(data?.matches || []).map((item) => {
          const isSelected = selectedItems.some((selected) => selected.id === item.id);
          return (
            <List.Item
              key={item.id}
              title={item.name}
              accessories={
                isSelected
                  ? [
                      { icon: Icon.Checkmark },
                      ...item.modes.map((mode) => ({ tag: { value: mode, color: getModeColor(mode) } })),
                    ]
                  : item.modes.map((mode) => ({ tag: { value: mode, color: getModeColor(mode) } }))
              }
              actions={
                <ActionPanel>
                  {isSelected ? (
                    <Action title="Deselect" onAction={() => handleDeselect(item)} />
                  ) : (
                    <Action title="Select" onAction={() => handleSelect(item)} />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
