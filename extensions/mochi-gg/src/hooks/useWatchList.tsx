import { useCallback, useEffect, useMemo } from "react";
import { Toast, showToast } from "@raycast/api";
import axios from "axios";
import useSWR from "swr";
import _ from "lodash";

import { IWatchList } from "../wl";
import useDiscord from "./useDiscord";
import { IDiscordUser, subscribeOnUserChange } from "../service/discord";
import { ITickerBaseCoin } from "../type/api";

export default function useWatchList() {
  const { user } = useDiscord();
  const { isLoading, isValidating, data, mutate } = useSWR<IWatchList>(
    user?.id ? `https://api.mochi.pod.town/api/v1/defi/watchlist?user_id=${user.id}` : null,
    (url) => {
      return axios.get(url).then(({ data }) => data.data);
    }
  );

  const refreshWatchList = useCallback(async () => {
    try {
      if (!user?.id) {
        return;
      }
      const dt = await axios
        .get(`https://api.mochi.pod.town/api/v1/defi/watchlist?user_id=${user.id}`)
        .then(({ data }) => data.data);

      mutate(dt);
    } catch (err) {
      if (err instanceof Error) {
        showToast({ style: Toast.Style.Failure, title: err.message });
      } else {
        console.error("[ERROR.refreshWatchList]", err);
        showToast({ style: Toast.Style.Failure, title: "Unexpected Error" });
      }
    }
  }, [user?.id]);

  const addTokenToWatchlist = useCallback(
    async (token: ITickerBaseCoin) => {
      try {
        await axios.post(`https://api.mochi.pod.town/api/v1/defi/watchlist`, {
          user_id: user?.id,
          symbol: token.symbol,
          coin_gecko_id: token.id,
        });
        showToast({
          style: Toast.Style.Success,
          title: `Added ${token.symbol.toUpperCase()} to your watch list`,
        });
      } catch (err) {
        if (err instanceof Error) {
          showToast({ style: Toast.Style.Failure, title: err.message });
        } else {
          console.error("[ERROR.addTokenToWatchlist]", err);
          showToast({ style: Toast.Style.Failure, title: "Unexpected Error" });
        }
      }
    },
    [user?.id]
  );

  const removeTokenFromWatchlist = useCallback(
    async (token: ITickerBaseCoin) => {
      try {
        await axios.delete(
          `https://api.mochi.pod.town/api/v1/defi/watchlist?user_id=${user?.id}&symbol=${token.symbol}`
        );
        await refreshWatchList();
        showToast({
          style: Toast.Style.Success,
          title: `${token.symbol.toUpperCase()} removed to your watch list`,
        });
      } catch (err) {
        if (err instanceof Error) {
          showToast({ style: Toast.Style.Failure, title: err.message });
        } else {
          console.error("[ERROR.addTokenToWatchlist]", err);
          showToast({ style: Toast.Style.Failure, title: "Unexpected Error" });
        }
      }
    },
    [user?.id, refreshWatchList]
  );

  useEffect(
    () =>
      subscribeOnUserChange((u?: IDiscordUser) => {
        if (!u?.id) {
          return;
        }
        refreshWatchList();
      }),
    [refreshWatchList]
  );

  const watchingMap: Record<string, boolean> = useMemo(() => {
    if (data?.metadata.total === 0) {
      return {};
    }

    return _.reduce(
      data?.data,
      (acc, curr) => {
        return { ...acc, [curr.id]: true };
      },
      {}
    );
  }, [data?.data]);

  return {
    data: user?.id ? data : undefined,
    isValidating,
    isLoading: user?.id ? false : isLoading || isValidating,
    watchingMap,
    refreshWatchList,
    addTokenToWatchlist,
    removeTokenFromWatchlist,
  };
}
