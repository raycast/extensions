import {
  List,
  Action,
  getPreferenceValues,
  Detail,
  ActionPanel,
  openExtensionPreferences,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import axios from "axios";
import { Preferences, TickerToken } from "./types";
import TokenDetailListItem from "./components/TokenDetailListItem";

export default function Command() {
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);

  if (!preferences["discord-uid"]) {
    return (
      <Detail
        markdown="Please set your Discord User ID in the preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const [query, setQuery] = useState<string>();
  const [debouncedQuery] = useDebounce(query?.trim().replace(new RegExp('"', "g"), ""), 200);

  const abortable = useRef<AbortController>();

  const { isLoading, data } = usePromise(
    async (query: string) => {
      const { data } = await axios.get(`https://api.mochi.pod.town/api/v1/defi/coins?query=${query}`);
      return data.data as TickerToken[];
    },
    [debouncedQuery as string],
    { abortable, execute: !!debouncedQuery }
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search token symbol"
      onSearchTextChange={setQuery}
      isShowingDetail
    >
      {data && data?.length > 0 ? (
        data.map((token: TickerToken) => (
          <TokenDetailListItem
            key={token.id}
            tokenTicker={token}
            extraActions={
              <Action
                title="Add To Watchlist"
                icon={{ source: Icon.Plus }}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Adding token to watchlist",
                  });

                  try {
                    const res = await axios.post(`https://api.mochi.pod.town/api/v1/defi/watchlist`, {
                      user_id: preferences["discord-uid"],
                      symbol: token.symbol,
                    });
                    if (res.status === 200) {
                      toast.title = "Token added to watchlist";
                      toast.style = Toast.Style.Success;
                    } else {
                      throw new Error("Failed to add token to watchlist");
                    }
                  } catch (e) {
                    toast.title = "Failed to add token to watchlist";
                    toast.style = Toast.Style.Failure;
                  }
                }}
              />
            }
          />
        ))
      ) : (
        <List.EmptyView title="Give query parameter to search" />
      )}
    </List>
  );
}
