import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";
import dayjs from "dayjs";
import React from "react";
import { formDescription } from "./constants/form-descriptions";
import { tickerCik } from "./constants/ticker-cik";
import { getSecFilings } from "./modules/get-sec-filings";

export default function Command() {
  const [searchText, setSearchText] = React.useState<string | null>(null);

  const isSearchValid =
    searchText !== null && searchText !== "" && searchText?.length >= 2;

  const { data, isLoading } = useFetch<
    Array<{
      symbol: string;
      name: string;
    }>
  >(`https://ticker-2e1ica8b9.now.sh/keyword/${searchText}`, {
    execute: isSearchValid,
  });

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search ticker or company name"
      isLoading={isLoading}
    >
      {!isSearchValid ? (
        <List.EmptyView title="Enter a ticker symbol or company name. Eg. AAPL" />
      ) : (
        data?.map((e) => (
          <List.Item
            key={e.symbol}
            title={e.name}
            subtitle={e.symbol}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Next"
                  icon={Icon.AppWindowSidebarLeft}
                  target={<Company ticker={e.symbol} />}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

const Company = ({ ticker }: { ticker: string }) => {
  const company = tickerCik.find((e) => e.ticker === ticker.toLowerCase());

  const { data, isLoading } = useCachedPromise(
    (cik: string) =>
      getSecFilings({
        cik,
      }),
    [company?.cik || ""],
    {
      execute: company !== undefined,
    },
  );

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data?.map((e) => {
        const formattedDate = dayjs(e.date).format("MMM DD, YYYY");

        return (
          <List.Item
            key={e.id}
            title={`${ticker} - Form ${e.filing}`}
            subtitle={formattedDate}
            keywords={[e.filing, e.date]}
            icon={Icon.Globe}
            detail={
              <List.Item.Detail
                markdown={`## ${formattedDate}\n${formDescription[e.filing]}`}
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={e.url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};
