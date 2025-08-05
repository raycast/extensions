import { List } from "@raycast/api";
import { getProgressIcon, useFetch } from "@raycast/utils";

type AttractionRateDetailProps = {
  mouse: Mouse;
};

export function AttractionRateList({ mouse }: AttractionRateDetailProps) {
  const { isLoading, data } = useFetch<string>(
    `https://mhct.win/searchByItem.php?item_id=${mouse.id}&item_type=mouse&timefilter=all_time&min_hunts=100`
  );

  const parsedData: AttractionRate[] = typeof data === "string" ? JSON.parse(data) : [];
  const sortedParsedData = parsedData.sort((a, b) => parseInt(b.rate) - parseInt(a.rate));

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Attraction Rates for ${mouse.value}`}
      searchBarPlaceholder={`Attraction Rates for ${mouse.value}`}
    >
      <List.EmptyView title="No matching locations or cheese found" description="Try a different search?" />

      {sortedParsedData.map((ar, index) => (
        <List.Item
          key={index}
          keywords={[ar.cheese]}
          title={ar.location}
          subtitle={{
            value: ar.cheese,
            tooltip: "Cheese",
          }}
          accessories={[
            {
              tag: ar.stage,
              tooltip: "Stage",
            },
            {
              text: `${parseInt(ar.rate) / 100}%`,
              icon: getProgressIcon(parseInt(ar.rate) / 10000),
              tooltip: "Attraction Rate",
            },
          ]}
        />
      ))}
    </List>
  );
}
