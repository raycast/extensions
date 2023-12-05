import { Action, ActionPanel, List } from "@raycast/api";
import { FavoriteAction } from "../favorite/FavoriteAction";
import { useCallback, useContext } from "react";
import { MarketsContext } from "../../contexts/MarketsContextProvider";
import { formatNumber } from "../../utils/numbers";

interface Props {
  market: Market;
  showingDetail: boolean;
  accessories: Array<List.Item.Accessory>;
  activity: MarketActivity;
}

export function MarketListItem({ market, accessories, activity }: Props) {
  const favoriteMarketsContext = useContext(MarketsContext);

  if (favoriteMarketsContext === null) {
    throw new Error("no favorite context");
  }

  const { list, favorite, unfavorite, showingDetail, setShowingDetail } = favoriteMarketsContext;

  const buildTitle = useCallback(
    (market: Market) => {
      let title = market.name;

      if (list.has(market.name)) {
        title = `⭐ ${title}`;
      }

      return title;
    },
    [list]
  );

  return (
    <List.Item
      key={market.name}
      title={buildTitle(market)}
      keywords={market.name.split("_")}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={`![Market](https://bff.whitebit.com/v1/canvas/raycast/trade/${
            market.name
          }.png?t=${new Date().getTime()})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Volume" text={String(formatNumber(activity?.base_volume))} />
              <List.Item.Detail.Metadata.Link
                title="Go To Trade"
                target={`https://whitebit.com/trade/${market.name}`}
                text={market.name}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action title="Toggle Details" onAction={() => setShowingDetail(!showingDetail)}></Action>
          <FavoriteAction
            favorite={list.has(market.name)}
            onFavorite={() => favorite(market.name)}
            onUnfavorite={() => unfavorite(market.name)}
          />
        </ActionPanel>
      }
    />
  );
}
