import { List, ActionPanel, Icon, Action } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { Ticker } from "../schema";
import { useCoin } from "../apis";
import SearchItemDetail from "./search-item-detail";

type SearchItemProps = Ticker & {
  // onAddToFavorite: VoidFunction;
  action: React.ReactNode;
};

export default function SearchItem({ id, name, symbol, action }: SearchItemProps) {
  const { isLoading, data } = useCoin(id);

  return (
    <List.Item
      key={id}
      icon={getAvatarIcon(symbol)}
      title={name}
      accessories={[
        {
          text: { value: symbol.toUpperCase() },
        },
      ]}
      // @ts-ignore
      detail={<SearchItemDetail isLoading={isLoading || !data?.data} {...data?.data} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in CoinMarketCap"
            icon={Icon.Globe}
            url={`https://coinmarketcap.com/currencies/${id}`}
          />
          {/* <Action
            title="Add to Favorites"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={onAddToFavorite}
          /> */}
          {action}
        </ActionPanel>
      }
    />
  );
}
