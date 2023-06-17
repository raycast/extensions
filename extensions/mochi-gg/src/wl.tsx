import { Detail, Icon, Grid, ActionPanel, Action, launchCommand, environment, LaunchType } from "@raycast/api";
import { useState, useMemo } from "react";
import _ from "lodash";
import Fuse from "fuse.js";
import { MOCHI_PROXY_ENDPOINT } from "./config/cfg";
import useDiscord from "./hooks/useDiscord";
import useWatchList from "./hooks/useWatchList";
import { ITickerMarketData } from "./type/api";

export interface IWatchList {
  metadata: Metadata;
  data: ITickerMarketData[];
}

export interface Metadata {
  page: number;
  size: number;
  total: number;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const { user, logoutDiscord } = useDiscord(true);

  const { isLoading, data, refreshWatchList, removeTokenFromWatchlist } = useWatchList();

  const fues = useMemo(() => {
    const options = {
      includeScore: false,
      // Search in `author` and in `tags` array
      keys: ["name", "symbol"],
    };

    return new Fuse(data?.data || [], options);
  }, [data]);

  const filteredList = useMemo(() => {
    if (!searchText) {
      return _.map(data?.data, (item) => ({ item })) || [];
    }

    return fues.search(searchText);
  }, [fues, searchText, data?.data]);

  const tokenLookUp: Record<string, ITickerMarketData> = useMemo(() => {
    return _.reduce(data?.data, (acc, item) => ({ [item.id]: item, ...acc }), {}) || {};
  }, [data]);

  if (user?.id && isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Zero}
      isLoading={isLoading || !data?.metadata || !user?.id}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Watch list • Mochi"
      searchBarPlaceholder="Search"
      aspectRatio={"16/9"}
      onSelectionChange={setSelectedToken as (id: string | null) => void}
      actions={
        !!user?.id && (
          <ActionPanel>
            <Action title="Log Out" onAction={logoutDiscord} icon={Icon.Logout} />
          </ActionPanel>
        )
      }
    >
      {!data?.metadata?.total && <Grid.EmptyView icon={Icon.Tray} title="No items in your watch list" />}

      {!!data?.metadata?.total &&
        filteredList
          .filter(({ item }) => !!item)
          .map(({ item }) => (
            <Grid.Item
              id={item.id}
              key={item.id}
              content={{
                source: `${MOCHI_PROXY_ENDPOINT}/api/ticker-compact?token=${item.id}&theme=${environment.theme}`,
              }}
              actions={
                <ActionPanel title="Watch list • Mochi">
                  <Action
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title={`View ${_.upperCase(tokenLookUp?.[selectedToken]?.symbol)}`}
                    onAction={() =>
                      launchCommand({
                        name: "ticker",
                        type: LaunchType.UserInitiated,
                        context: { token: selectedToken, src: "watchlist-grid-view", disableSearch: true },
                      })
                    }
                    icon={Icon.LineChart}
                  />
                  <Action
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title={`Remove ${_.upperCase(tokenLookUp?.[selectedToken]?.symbol)}`}
                    style={Action.Style.Destructive}
                    onAction={() => removeTokenFromWatchlist(item)}
                    icon={Icon.LineChart}
                  />
                  <Action title="Refresh" onAction={refreshWatchList} icon={Icon.Repeat} />
                  {!!user?.id && <Action title="Log Out" onAction={logoutDiscord} icon={Icon.Logout} />}
                </ActionPanel>
              }
            />
          ))}
    </Grid>
  );
}
