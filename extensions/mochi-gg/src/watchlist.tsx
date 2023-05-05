import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useMemo, useRef } from "react";
import { Preferences, TickerToken } from "./types";
import { usePromise } from "@raycast/utils";
import axios from "axios";
import TokenDetailListItem from "./components/TokenDetailListItem";

const noTokensInWatchlistMarkdown = `
Add tokens to your watchlist by using the \`/watchlist add\` command in Discord or by using the command menu on the \`Search Tokens\` command on Raycast.
              
We are adding including some defaults here so that you can explore the feature!
`;

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

  const abortable = useRef<AbortController>();

  const { isLoading, data } = usePromise(
    async (userId: string) => {
      const { data } = await axios.get(`https://api.mochi.pod.town/api/v1/defi/watchlist?user_id=${userId}`);

      console.log(data.data.data);

      const defaultTokens = data.data.data.filter((token: any) => token.is_default);

      const notDefaultTokens = data.data.data.filter((token: any) => !token.is_default);

      return { defaultTokens, notDefaultTokens };
    },
    [preferences["discord-uid"] as string],
    { abortable, execute: !!preferences["discord-uid"] }
  );

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data && data?.notDefaultTokens.length > 0 ? (
        data.notDefaultTokens.map((token: TickerToken) => (
          <TokenDetailListItem
            key={token.id}
            tokenTicker={{ id: token.id, name: token.name, symbol: token.symbol }}
            extraActions={
              <Action
                title="Remove From Watchlist"
                style={Action.Style.Destructive}
                icon={{ source: Icon.Minus }}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Removing token from watchlist",
                  });

                  try {
                    const res = await axios.delete(
                      `https://api.mochi.pod.town/api/v1/defi/watchlist?user_id=${preferences["discord-uid"]}&symbol=${token.symbol}`
                    );
                    if (res.status === 200) {
                      toast.title = "Token removed from watchlist";
                      toast.style = Toast.Style.Success;
                    } else {
                      throw new Error("Failed to remove token from watchlist");
                    }
                  } catch (e) {
                    console.log(e);
                    toast.title = "Failed to remove token from watchlist";
                    toast.style = Toast.Style.Failure;
                  }
                }}
              />
            }
          />
        ))
      ) : (
        <List.Item
          title="Add tokens to your watchlist"
          detail={<List.Item.Detail markdown={noTokensInWatchlistMarkdown} />}
        />
      )}
      <List.Section title="Default Tokens">
        {data &&
          data.defaultTokens.map((token: TickerToken) => (
            <TokenDetailListItem
              key={token.id}
              tokenTicker={{ id: token.id, name: token.name, symbol: token.symbol }}
            />
          ))}
      </List.Section>
    </List>
  );
}
