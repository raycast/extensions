import { ActionPanel, List, Action, Image } from "@raycast/api";
import { useFetchData } from "./hooks/gainersLosersHooks";
import { SearchResult } from "./types/gainersLosersType";

export default function Command() {
  const { gainers, losers, isLoading } = useFetchData();

  return (
    <List isLoading={isLoading}>
      <List.Section title="Gainers">
        {gainers.map((coin) => (
          <SearchListItem key={coin.id} searchResult={coin} />
        ))}
      </List.Section>
      <List.Section title="Losers">
        {losers.map((coin) => (
          <SearchListItem key={coin.id} searchResult={coin} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const changeText = parseFloat(searchResult.change) > 0 ? `+${searchResult.change}%` : `${searchResult.change}%`;

  return (
    <List.Item
      key={searchResult.id}
      icon={{ source: searchResult.image, mask: Image.Mask.RoundedRectangle }}
      title={`${searchResult.symbol} - ${searchResult.name}`}
      accessories={[
        { text: searchResult.rank },
        { text: searchResult.price },
        { text: searchResult.marketCap },
        { text: changeText },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Dropstab"
              url={`https://dropstab.com/coins/${searchResult.slug}`}
              icon="dropstab-logo.png"
            />
            {searchResult.twitter && (
              <Action.OpenInBrowser title="Open Twitter" url={searchResult.twitter} icon="twitter.png" />
            )}
            {searchResult.website && <Action.OpenInBrowser title="Open Website" url={searchResult.website} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
