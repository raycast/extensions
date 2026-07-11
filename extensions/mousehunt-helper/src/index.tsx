import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { AttractionRateList } from "./AttractionRateList";

export default function Command() {
  const { isLoading, data } = useFetch<string>(
    "https://mhct.win/searchByItem.php?item_id=all&item_type=mouse&timefilter=all_time&min_hunts=100"
  );

  const parsedData: Mouse[] = typeof data === "string" ? JSON.parse(data) : [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for mice">
      <List.EmptyView title="No matching mice found" description="Try a different search?" />

      {parsedData.map((mouse, index) => (
        <List.Item
          key={index}
          title={mouse.value}
          actions={
            <ActionPanel>
              <Action.Push title="Show Attraction Rates" target={<AttractionRateList mouse={mouse} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
