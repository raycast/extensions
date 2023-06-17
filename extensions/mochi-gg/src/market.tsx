/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  LaunchType,
  List,
  Toast,
  environment,
  launchCommand,
  showToast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatNumber, formatPercent } from "./utils/string";
import _ from "lodash";
import Fuse from "fuse.js";
import { Color } from "@raycast/api";
import useSWR from "swr";
import axios from "axios";
import { MOCHI_PROXY_ENDPOINT } from "./config/cfg";
import { mapLimit } from "async";
import useDiscord from "./hooks/useDiscord";
import useWatchList from "./hooks/useWatchList";
import {
  IBaseCoin,
  ICoinCompareResult,
  ICoinSuggestion,
  IMarketData,
  IMarketDataResp,
  ITickerBaseCoin,
  ITickerResp,
} from "./type/api";

const EmptyArr = [] as IMarketData[];

export default function Main() {
  const { isLoading, data, error, revalidate } = useFetch<IMarketDataResp>(
    "https://api.mochi.pod.town/api/v1/defi/market-data"
  );

  const [bgSearching, setBgSearch] = useState(false);

  const [sortBy, setSortBy] = useState<"market_cap_rank" | "">("");
  const [searchText, setSearchText] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [interval, setInterval] = useState(7);
  const [viewDetails, setViewDetail] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [extraData, setExtraData] = useState(EmptyArr);
  const { user, loginDiscord, logoutDiscord } = useDiscord(false);
  const { addTokenToWatchlist, watchingMap, removeTokenFromWatchlist } = useWatchList();
  const {
    isLoading: isLoadingDetails,
    data: itemDetailData,
    mutate,
  } = useSWR<ITickerResp>(
    selectedToken && viewMode === "list"
      ? `${MOCHI_PROXY_ENDPOINT}/api/ticker?token=${selectedToken}&time_step=${interval}&currency=usd&theme=${environment.theme}&size=small`
      : null,
    (url) => {
      return axios.get(url).then(({ data }) => data);
    }
  );

  const tokenLookUp: Record<string, IMarketData> = useMemo(() => {
    const concatData = _.concat(data?.data, extraData).filter((item) => !!item?.id) as IMarketData[];

    return _.reduce(concatData, (acc, item) => ({ [item.id]: item, ...acc }), {});
  }, [data?.data, extraData]);

  const tokenLookUpNoExtra: Record<string, IMarketData> = useMemo(() => {
    const filteredData = _.filter(data?.data, (item) => !!item?.id) as IMarketData[];

    return _.reduce(filteredData, (acc, item) => ({ [item.id]: item, ...acc }), {});
  }, [data?.data]);

  const canDoBgSearch = extraData.length === 0;

  useEffect(() => {
    if (bgSearching && !canDoBgSearch) {
      return;
    }

    function getCoinDetails(id: string) {
      return axios
        .get<{ data: IBaseCoin }>(`https://api.mochi.pod.town/api/v1/defi/coins/${id}`)
        .then(({ data: { data } }) => {
          return {
            id: data.id,
            name: data.name,
            symbol: data.symbol,
            image: data.image.small,
            current_price: data.market_data.current_price.usd,
            market_cap: data.market_data.market_cap.usd,
            price_change_percentage_24h: data.market_data.price_change_percentage_24h_in_currency.usd,
            price_change_percentage_7d_in_currency: data.market_data.price_change_percentage_7d_in_currency.usd,
          } as IMarketData;
        });
    }

    async function getCoins(search: string) {
      if (search === "" || tokenLookUpNoExtra[search]) {
        return;
      }

      try {
        const query = search.toLowerCase().replace(/ /g, "-");
        if (query.length < 2) {
          return;
        }

        setBgSearch(true);
        const {
          data: { data },
        } = await axios.get<ICoinCompareResult>(
          `https://api.mochi.pod.town/api/v1/defi/coins/compare?base=${query}&interval=7&target=usd`
        );
        if (data.base_coin_suggestions) {
          mapLimit<ICoinSuggestion, IMarketData>(
            data.base_coin_suggestions,
            5,
            async (item: ICoinSuggestion) => {
              console.log("[getCoins]", JSON.stringify(item, null, 4));
              return getCoinDetails(item.id);
            },
            (err, results) => {
              console.error("[getCoins]", search, err);
              const items = _.filter(results, (item: IMarketData) => !!tokenLookUpNoExtra[item?.id]);
              setExtraData(items as IMarketData[]);
            }
          );
        } else {
          const dt = await getCoinDetails(query);
          if (!tokenLookUpNoExtra[dt.id]) {
            setExtraData([dt]);
            return;
          }
        }
      } catch (err) {
        console.error(`[ERROR.getCoins]`, err);
      } finally {
        setBgSearch(false);
      }
    }

    getCoins(searchText);
  }, [tokenLookUpNoExtra, searchText, canDoBgSearch]);

  const fues = useMemo(() => {
    const options = {
      includeScore: false,
      // Search in `author` and in `tags` array
      keys: ["name", "symbol"],
    };
    const src = sortBy
      ? _.chain(data?.data).concat(extraData).uniqBy("id").sortBy(sortBy).reverse().value()
      : _.chain(data?.data).concat(extraData).unionBy("id").value();
    return new Fuse(src, options);
  }, [data, extraData, sortBy]);

  const filteredList = useMemo(() => {
    if (!searchText) {
      const src = sortBy ? _.chain(data?.data).sortBy(sortBy).uniqBy("id").reverse().value() : data?.data || [];
      return src.map((item) => ({ item })) || [];
    }

    return fues.search(searchText);
  }, [fues, searchText, sortBy, data]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const AddWatchListAction = (item: ITickerBaseCoin) =>
    user?.id ? (
      <Action
        title={watchingMap[item.id] ? "Remove From Watch List" : "Add to Watch List"}
        onAction={async () => {
          if (watchingMap[item.id]) {
            await removeTokenFromWatchlist(item);
          } else {
            await addTokenToWatchlist(item);
            revalidate();
          }
        }}
        // @ts-ignore
        style={watchingMap[item.id] ? "destructive" : "regular"}
        icon={watchingMap[item.id] ? Icon.Trash : Icon.Plus}
      />
    ) : (
      <Action
        title={"Connect with Discord"}
        onAction={loginDiscord}
        icon={environment.theme === "light" ? "discord-mark-black.png" : "discord-mark-white.png"}
      />
    );

  if (viewMode === "grid") {
    return (
      <Grid
        throttle={true}
        columns={4}
        inset={Grid.Inset.Zero}
        isLoading={isLoading || bgSearching}
        filtering={false}
        onSearchTextChange={setSearchText}
        navigationTitle="Coin market • Mochi"
        searchBarPlaceholder="Search for a token..."
        aspectRatio={"16/9"}
        onSelectionChange={setSelectedToken as (id: string | null) => void}
      >
        {filteredList
          .filter(({ item }) => !!item)
          .map(({ item }) => (
            <Grid.Item
              id={item.id}
              key={item.id}
              content={{
                source: `${MOCHI_PROXY_ENDPOINT}/api/ticker-compact?token=${item.id}&theme=${environment.theme}`,
              }}
              actions={
                <ActionPanel title="Actions items">
                  <Action
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title={`View ${_.upperCase(tokenLookUp?.[selectedToken]?.symbol)}`}
                    onAction={() =>
                      launchCommand({
                        name: "ticker",
                        type: LaunchType.UserInitiated,
                        context: { token: selectedToken, src: "market-grid-view", disableSearch: true },
                      })
                    }
                    icon={Icon.LineChart}
                  />
                  {AddWatchListAction(item as ITickerBaseCoin)}
                  <Action
                    title="Refresh"
                    onAction={() => {
                      revalidate();
                      mutate();
                    }}
                    icon={Icon.Repeat}
                  />
                  <Action
                    title="List View"
                    onAction={() => {
                      setViewMode("list");
                    }}
                    icon={Icon.AppWindowList}
                  />
                  <Action.OpenInBrowser title="View Heatmap in Browser" url={`${MOCHI_PROXY_ENDPOINT}/heatmap`} />
                  {!!user?.id && <Action title="Log Out" onAction={logoutDiscord} icon={Icon.Logout} />}
                </ActionPanel>
              }
            />
          ))}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingDetails}
      isShowingDetail={viewDetails}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Coin market • Mochi"
      searchBarPlaceholder="Search for a token..."
      onSelectionChange={setSelectedToken as (id: string | null) => void}
      throttle
    >
      {filteredList
        .filter(({ item }) => !!item)
        .map(({ item }) => (
          <List.Item
            id={item.id}
            key={item.id}
            title={item.name}
            subtitle={`${formatCurrency(item.current_price)}`}
            // @ts-ignore
            accessories={[
              watchingMap[item.id] && {
                icon: Icon.Eye,
                tag: !viewDetails ? "Watching" : undefined,
              },
              {
                text: {
                  value:
                    item.price_change_percentage_24h > 0
                      ? `${formatNumber(+item.price_change_percentage_24h.toFixed(4))}%`
                      : `${formatNumber(item.price_change_percentage_24h)}%`,
                  color: item.price_change_percentage_24h > 0 ? Color.Green : Color.Red,
                },
                icon: Icon.Heartbeat,
              },
            ].filter(Boolean)}
            icon={{ source: item.image }}
            actions={
              <ActionPanel>
                {!viewDetails ? (
                  <>
                    <Action
                      // eslint-disable-next-line @raycast/prefer-title-case
                      title={`View ${_.upperCase(tokenLookUp?.[selectedToken]?.symbol)}`}
                      onAction={() => setViewDetail(!viewDetails)}
                      icon={Icon.LineChart}
                    />
                    {AddWatchListAction(item)}
                    <Action
                      title="Refresh"
                      onAction={() => {
                        revalidate();
                        mutate();
                      }}
                      icon={Icon.Repeat}
                    />
                  </>
                ) : (
                  <>
                    <Action
                      title="Refresh"
                      onAction={() => {
                        revalidate();
                        mutate();
                      }}
                      icon={Icon.Repeat}
                    />
                    {AddWatchListAction(item)}
                    {interval != 1 && (
                      <Action title="View 1 Day" onAction={() => setInterval(1)} icon={Icon.Calendar} />
                    )}
                    {interval != 7 && (
                      <Action title="View 7 Days" onAction={() => setInterval(7)} icon={Icon.Calendar} />
                    )}
                    {interval != 30 && (
                      <Action title="View 30 Days" onAction={() => setInterval(30)} icon={Icon.Calendar} />
                    )}
                  </>
                )}
                <Action
                  title="Grid View"
                  onAction={() => {
                    setViewMode("grid");
                  }}
                  icon={Icon.AppWindowGrid3x3}
                />
                <Action.OpenInBrowser title="View Heatmap in Browser" url={`${MOCHI_PROXY_ENDPOINT}/heatmap`} />
                {viewMode === "list" && (
                  <Action
                    title={!sortBy ? "Sort by Market Rank" : "Remove Sort"}
                    onAction={() => setSortBy(!sortBy ? "market_cap_rank" : "")}
                    icon={Icon.List}
                  />
                )}
                {!!user?.id && <Action title="Log Out" onAction={logoutDiscord} icon={Icon.Logout} />}
                {viewDetails && (
                  <Action title="Close Detail View" onAction={() => setViewDetail(!viewDetails)} icon={Icon.Multiply} />
                )}
              </ActionPanel>
            }
            detail={
              itemDetailData?.base_coin.id === item.id && (
                <List.Item.Detail
                  markdown={itemDetailData.markdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Token"
                        text={`${itemDetailData.base_coin.name} (${itemDetailData.base_coin.symbol.toUpperCase()})`}
                        icon={{ source: itemDetailData.base_coin.image }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Market cap"
                        text={formatCurrency(itemDetailData.base_coin.market_data.market_cap)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Price"
                        text={formatCurrency(itemDetailData.base_coin.market_data.current_price)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="1h change">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={formatPercent(itemDetailData.base_coin.market_data.percentage_1h || 0)}
                          color={+itemDetailData.base_coin.market_data.percentage_1h > 0 ? "#60C488" : "#D64B49"}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.TagList title="24h change">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={formatPercent(itemDetailData.base_coin.market_data.percentage_24h || 0)}
                          color={+itemDetailData.base_coin.market_data.percentage_24h > 0 ? "#60C488" : "#D64B49"}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.TagList title="7d changes">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={formatPercent(itemDetailData.base_coin.market_data.percentage_7d || 0)}
                          color={+itemDetailData.base_coin.market_data.percentage_7d > 0 ? "#60C488" : "#D64B49"}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              )
            }
          />
        ))}
    </List>
  );
}
