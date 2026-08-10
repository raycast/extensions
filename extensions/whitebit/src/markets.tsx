import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { FetchError } from "ofetch";
import { useEffect, useState } from "react";
import { MarketsRequester } from "./api/markets";
import { useFavoriteMarkets } from "./hooks/use-favorite-markets";
import { useStoredState } from "./hooks/use-stored-state";

import { useHttpClient } from "./hooks/use-http-client";
import { MarketListItem } from "./components/markets/MarketListItem";
import { useMarketsActivity } from "./hooks/use-markets-activity";
import { MarketsContext } from "./contexts/MarketsContextProvider";
import { useInterval } from "usehooks-ts";

export default function Command() {
  const client = useHttpClient();

  const marketsRequester = new MarketsRequester(client);

  async function fetchMarkets() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching markets",
    });

    try {
      const response = await marketsRequester.list();

      toast.style = Toast.Style.Success;
      toast.title = "Markets fetched successfully";

      return response;
    } catch (e) {
      if (e instanceof FetchError) {
        toast.style = Toast.Style.Failure;
        toast.message = e.message;
        return;
      }

      throw e;
    }
  }

  const [lastActivityUpdate, setLastActivityUpdate] = useState(new Date());

  const [list, setList] = useState<Array<Market>>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(function () {
    fetchMarkets()
      .then((items) => {
        if (items) {
          setList(items);
          setIsLoading(false);
        }
      })
      .catch((e) => console.log(e));
  }, []);

  const [showingDetail, setShowingDetail] = useStoredState("markets_details", false);

  const { updateActivity, state: marketsActivity } = useMarketsActivity();

  const [autoRefresh, setAutoRefresh] = useStoredState("markets_auto_refresh", false);
  useInterval(
    async () => {
      await updateActivity();

      setLastActivityUpdate(new Date());
    },
    autoRefresh ? 5000 : null
  );

  useEffect(() => {
    updateActivity();
  }, []);

  const favoriteMarketsWrapper = useFavoriteMarkets();
  const { list: favoriteMarkets } = favoriteMarketsWrapper;

  const groupedMarkets = () => {
    const favorite: Market[] = [];
    const other: Market[] = [];

    for (const market of list) {
      const target = favoriteMarkets.has(market.name) ? favorite : other;

      target.push(market);
    }
    // console.log(favorite);
    return [favorite, other];
  };

  const [favoriteList, otherList] = groupedMarkets();

  function prepareTagForMarket(market: Market): Array<List.Item.Accessory | undefined> | undefined {
    const activity = marketsActivity[market.name];

    if (activity === undefined) {
      return undefined;
    }

    return [
      !showingDetail
        ? {
            tag: {
              value: String(activity.last_price),
              color: Color.SecondaryText,
            },
            icon: Icon.Coins,
            tooltip: "Last Price",
          }
        : undefined,
      {
        tag: {
          value: `${activity.change}%`,
          color: Number(activity.change) > 0 ? Color.Green : Color.Red,
        },
        icon: Number(activity.change) > 0 ? Icon.ArrowUp : Icon.ArrowDown,
      },
    ];
  }

  function prepareTags(market: Market): Array<List.Item.Accessory> {
    const array = prepareTagForMarket(market);

    return array?.filter((item) => item !== undefined) as Array<List.Item.Accessory>;
  }

  return (
    <List searchBarPlaceholder="Search markets..." isShowingDetail={showingDetail} isLoading={isLoading}>
      <List.Item
        icon={Icon.Repeat}
        title="Auto refresh"
        keywords={[]}
        subtitle="Updates market's activity every 5 seconds"
        detail={
          <List.Item.Detail
            markdown={`Auto refresh updates market activity each 5 seconds.`}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Last Update" text={lastActivityUpdate.toTimeString()} />
              </List.Item.Detail.Metadata>
            }
          />
        }
        accessories={[
          {
            tag: {
              value: autoRefresh ? (showingDetail ? "ON" : "Enabled") : showingDetail ? "OFF" : "Disabled",
              color: autoRefresh ? Color.Green : Color.SecondaryText,
            },
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={autoRefresh ? "Disable Auto-Refresh" : "Enable Auto-Refresh"}
              onAction={() => setAutoRefresh(!autoRefresh)}
            />
          </ActionPanel>
        }
      ></List.Item>
      <MarketsContext.Provider
        value={{
          ...favoriteMarketsWrapper,
          setShowingDetail,
          showingDetail,
        }}
      >
        <>
          <List.Section title="Favorite">
            {favoriteList.map((market) => (
              <MarketListItem
                accessories={prepareTags(market)}
                activity={marketsActivity[market.name]}
                showingDetail={true}
                key={market.name + "fav"}
                market={market}
              />
            ))}
          </List.Section>
          <List.Section title="All">
            {otherList.map((market) => (
              <MarketListItem
                accessories={prepareTags(market)}
                activity={marketsActivity[market.name]}
                showingDetail={true}
                key={market.name}
                market={market}
              />
            ))}
          </List.Section>
        </>
      </MarketsContext.Provider>
    </List>
  );
}
