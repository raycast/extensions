/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Action, ActionPanel, Detail, Icon, LaunchProps, List, Toast, environment, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { formatCurrency, formatPercent } from "./utils/string";
import _ from "lodash";
import useDiscord from "./hooks/useDiscord";
import useWatchList from "./hooks/useWatchList";
import { MOCHI_PROXY_ENDPOINT } from "./config/cfg";

export default function Main({
  arguments: props,
  launchContext,
}: LaunchProps<{
  arguments: { token: string };
  launchContext: { token: string; src: string; disableSearch: boolean };
}>) {
  const [interval, setInterval] = useState(7);
  const [token, setToken] = useState((props?.token || launchContext?.token || "bitcoin").replace(/ /g, "-"));
  const { user, loginDiscord, logoutDiscord } = useDiscord(false);
  const { addTokenToWatchlist, watchingMap, removeTokenFromWatchlist } = useWatchList();

  const { data: { data: tokens = [] } = {} } = useFetch<{ markdown?: string } & Record<string, any>>(
    !launchContext?.disableSearch
      ? `https://api.mochi.pod.town/api/v1/defi/coins?query=${props?.token || launchContext?.token || "btc"}`
      : ""
  );

  const {
    isLoading,
    data: { markdown, base_coin: data } = {},
    error,
    revalidate,
  } = useFetch<{ markdown?: string } & Record<string, any>>(
    `${MOCHI_PROXY_ENDPOINT}/api/ticker?token=${token || "bitcoin"}&time_step=${interval}&currency=usd&theme=${
      environment.theme
    }`
  );

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const AddWatchListAction = (item: any) =>
    user?.id ? (
      <>
        <Action
          title={watchingMap[item?.id] ? "Remove From Watch List" : "Add to Watch List"}
          onAction={async () => {
            if (watchingMap[item?.id]) {
              removeTokenFromWatchlist(item);
            } else {
              addTokenToWatchlist(item);
            }
          }}
          // @ts-ignore
          style={watchingMap[item?.id] ? "destructive" : "regular"}
          icon={watchingMap[item?.id] ? Icon.Trash : Icon.Plus}
        />
        <Action title="Log Out" onAction={logoutDiscord} icon={Icon.Logout} />
      </>
    ) : (
      <Action
        title={"Connect with Discord"}
        onAction={async () => {
          loginDiscord();
        }}
        icon={environment.theme === "light" ? "discord-mark-black.png" : "discord-mark-white.png"}
      />
    );

  if (!data && error) {
    return (
      <List onSearchTextChange={(txt) => setToken(txt)} searchBarPlaceholder="Search for other token" throttle>
        <List.EmptyView icon={Icon.MagnifyingGlass} title={`"${token}" Not found`} />
      </List>
    );
  }

  return (
    <Detail
      isLoading={!markdown || !data || isLoading}
      markdown={markdown || ""}
      navigationTitle={`Exchange rates ${_.upperCase(data?.symbol || token)}/USD • Coingecko | Mochi`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Token"
            text={[data?.name || "Loading...", _.toUpper(data?.symbol)].filter(Boolean).join(" - ")}
            icon={{ source: data?.image }}
          />
          <Detail.Metadata.Label title="Market cap" text={formatCurrency(data?.market_data?.market_cap)} />
          <Detail.Metadata.Label title="Price (USD)" text={formatCurrency(data?.market_data?.current_price)} />
          <Detail.Metadata.Separator />
          {!!data?.market_data && !isLoading && (
            <>
              <Detail.Metadata.TagList title="1h change">
                <Detail.Metadata.TagList.Item
                  text={formatPercent(data.market_data.percentage_1h || 0)}
                  color={+data.market_data.percentage_1h > 0 ? "#60C488" : "#D64B49"}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.TagList title="24h change">
                <Detail.Metadata.TagList.Item
                  text={formatPercent(data.market_data.percentage_24h || 0)}
                  color={+data.market_data.percentage_24h > 0 ? "#60C488" : "#D64B49"}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.TagList title="7d changes">
                <Detail.Metadata.TagList.Item
                  text={formatPercent(data.market_data.percentage_7d || 0)}
                  color={+data.market_data.percentage_7d > 0 ? "#60C488" : "#D64B49"}
                />
              </Detail.Metadata.TagList>
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel title="Ticker • Mochi">
          <Action title={"Refresh"} onAction={revalidate} icon={Icon.Repeat} />
          {!!tokens.length && (
            <ActionPanel.Section title="Alternative tokens">
              {_.filter(tokens, (item) => item.id !== data?.id).map((item) => (
                <Action
                  key={item.id}
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title={`${_.capitalize(item.name)} - ${_.upperCase(item.symbol)}`}
                  onAction={() => setToken(item.id)}
                />
              ))}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Chart view">
            {interval != 1 && <Action title="1 Day" onAction={() => setInterval(1)} icon={Icon.Calendar} />}
            {interval != 7 && <Action title="7 Days" onAction={() => setInterval(7)} icon={Icon.Calendar} />}
            {interval != 30 && <Action title="30 Days" onAction={() => setInterval(30)} icon={Icon.Calendar} />}
          </ActionPanel.Section>
          {AddWatchListAction(data)}
        </ActionPanel>
      }
    />
  );
}
