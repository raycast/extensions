import { Action, ActionPanel, Color, launchCommand, LaunchType, List, showToast, Toast } from "@raycast/api";
import { BalanceRequester, MainBalanceResponse, TradeBalanceResponse } from "./api/balance";
import { Fragment, useEffect, useState } from "react";
import { AddressRequester, AddressResponse } from "./api/address";
import { sleep } from "./utils/timeout";
import { FetchError } from "ofetch";
import Style = Toast.Style;
import { useAssets } from "./hooks/use-assets";
import { useFavoriteAssets } from "./hooks/use-favorite-assets";
import { useHttpClient } from "./hooks/use-http-client";
import { FavoriteAction } from "./components/favorite/FavoriteAction";
import { formatNumber } from "./utils/numbers";

export default function Metadata() {
  const client = useHttpClient();

  const [finished, setFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const balance = new BalanceRequester(client);

  const { assets } = useAssets(client);
  const { favoriteAssets, favorite, unfavorite } = useFavoriteAssets();

  const [mainBalances, setMainBalances] = useState<MainBalanceResponse>({});
  const [tradeBalances, setTradeBalances] = useState<TradeBalanceResponse>({});

  useEffect(() => {
    balance
      .main()
      .then((result) => {
        setMainBalances(result);
      })
      .catch(async (err) => {
        await showToast(Style.Failure, err.message);
      });

    setTimeout(() => {
      balance
        .trade()
        .then((result) => {
          setTradeBalances(result);
          setIsLoading(false);
        })
        .catch(async (err) => {
          await showToast(Style.Failure, err.message);
        })
        .finally(() => setFinished(true));
    }, 1000);
  }, []);

  function combineTickerWithNetwork(ticker: string, network: string): string {
    return ticker === network ? ticker : `${ticker}_${network}`;
  }

  const addressRequester = new AddressRequester(client);
  const [addresses, setAddresses] = useState<Record<string, AddressResponse>>({});

  async function _fetchAddresses(ticker: string) {
    const networks = assets[ticker].networks.deposits;

    const tmp = Object.assign({}, addresses);

    for (const network of networks) {
      await sleep(async () => {
        tmp[combineTickerWithNetwork(ticker, network)] =
          network === ticker ? await addressRequester.deposit(ticker) : await addressRequester.deposit(ticker, network);
      });
    }

    return tmp;
  }

  const [addressesIsLoading, setAddressesIsLoading] = useState(false);

  async function fetchAddress(ticker: string) {
    setAddressesIsLoading(true);
    const toast = await showToast({
      title: `Fetching addresses for ${ticker}`,
      style: Style.Animated,
    });

    try {
      setAddresses(await _fetchAddresses(ticker));

      toast.style = Style.Success;
      toast.title = "Addresses fetched successfully";
    } catch (e) {
      let message = "Unexpected error";

      if (e instanceof FetchError) {
        message = e.message;
      }

      toast.style = Style.Failure;
      toast.title = message;
    } finally {
      setAddressesIsLoading(false);
    }
  }

  function groupedBalances() {
    const favorite: Ticker[] = [];
    const other: Ticker[] = [];

    for (const ticker of Object.keys(mainBalances)) {
      const target = favoriteAssets.has(ticker) ? favorite : other;

      target.push(ticker);
    }

    return [favorite, other];
  }

  const [favoriteTickers, otherTickers] = groupedBalances();

  function buildTitle(ticker: Ticker) {
    let title = ticker;

    if (favoriteAssets.has(ticker)) {
      title = `⭐ ${title}`;
    }

    return title;
  }

  function BalanceListItem({ ticker }: { ticker: Ticker }) {
    return (
      <List.Item
        title={buildTitle(ticker)}
        subtitle={assets[ticker]?.name}
        key={ticker}
        accessories={[
          {
            tag: {
              value: `${formatNumber(
                Number(mainBalances[ticker].main_balance) + Number(tradeBalances[ticker]?.available || "0")
              )} ${ticker}`,
              color: Color.Blue,
            },
            tooltip: "Total Balance",
          },
        ]}
        actions={
          finished && (
            <ActionPanel>
              <FavoriteAction
                favorite={favoriteAssets.has(ticker)}
                onFavorite={() => favorite(ticker)}
                onUnfavorite={() => unfavorite(ticker)}
              ></FavoriteAction>
              <Action
                title="Transfer Between Balances"
                onAction={async () =>
                  await launchCommand({
                    name: "transfer_balance",
                    type: LaunchType.UserInitiated,
                    arguments: { ticker },
                  })
                }
              />
              <ActionPanel.Submenu
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                title="Deposit Addresses"
                isLoading={addressesIsLoading}
              >
                <Action
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => fetchAddress(ticker)}
                  title="Fetch Deposit Addresses"
                ></Action>
                {assets[ticker]?.networks?.deposits &&
                  assets[ticker].networks.deposits.map((network) => (
                    <Fragment key={combineTickerWithNetwork(ticker, network)}>
                      {addresses[combineTickerWithNetwork(ticker, network)] &&
                        addresses[combineTickerWithNetwork(ticker, network)].account && (
                          <Action.CopyToClipboard
                            content={addresses[combineTickerWithNetwork(ticker, network)].account.address}
                            title={network}
                          />
                        )}
                      {addresses[combineTickerWithNetwork(ticker, network)] &&
                        addresses[combineTickerWithNetwork(ticker, network)].account.memo && (
                          <Action.CopyToClipboard
                            content={String(addresses[combineTickerWithNetwork(ticker, network)].account.memo)}
                            title={`${network} Memo`}
                          />
                        )}
                    </Fragment>
                  ))}
              </ActionPanel.Submenu>
            </ActionPanel>
          )
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Main Balance" />
                <List.Item.Detail.Metadata.Label
                  title="Available"
                  text={`${formatNumber(mainBalances[ticker].main_balance)} ${ticker}`}
                />
                {tradeBalances[ticker] && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Trade Balance" />
                    <List.Item.Detail.Metadata.Label
                      title="Available"
                      text={`${formatNumber(tradeBalances[ticker].available)} ${ticker}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="In Orders"
                      text={`${formatNumber(tradeBalances[ticker].available)} ${ticker}`}
                    />
                  </>
                )}
                {assets[ticker]?.networks?.deposits &&
                  assets[ticker].networks.deposits.map((network) => (
                    <Fragment key={combineTickerWithNetwork(ticker, network)}>
                      {addresses[combineTickerWithNetwork(ticker, network)] &&
                        addresses[combineTickerWithNetwork(ticker, network)].account && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title={combineTickerWithNetwork(ticker, network)} />
                            <List.Item.Detail.Metadata.Label
                              title="Address"
                              text={addresses[combineTickerWithNetwork(ticker, network)].account.address}
                            />
                            {addresses[combineTickerWithNetwork(ticker, network)].account.memo && (
                              <List.Item.Detail.Metadata.Label
                                title="Memo"
                                text={addresses[combineTickerWithNetwork(ticker, network)].account.memo}
                              />
                            )}
                          </>
                        )}
                    </Fragment>
                  ))}
                <List.Item.Detail.Metadata.Separator />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      <List.Section title="Favorite">
        {favoriteTickers.map((ticker) => (
          <BalanceListItem key={ticker} ticker={ticker}></BalanceListItem>
        ))}
      </List.Section>
      <List.Section title="All">
        {otherTickers.map((ticker) => (
          <BalanceListItem key={ticker} ticker={ticker}></BalanceListItem>
        ))}
      </List.Section>
    </List>
  );
}
