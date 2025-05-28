import { ClosePositionForm } from '@components/closePositionForm';
import { usePositions } from '@hooks/usePositions';
import { Action, ActionPanel, Color, Icon, Image, List, useNavigation } from '@raycast/api';
import { useCachedState } from '@raycast/utils';
import { asDollarAmt, asPercentage, getAssetImage } from '@utils/display';

export default function ManagePositions() {
  const [showingDetails, setShowDetails] = useCachedState('list-positions-show-details', false);
  const { isLoading, positions, revalidate, error } = usePositions();
  const { pop } = useNavigation();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isLoading && positions.length !== 0 && showingDetails}
      searchBarPlaceholder="Search by symbol, asset class, side, exchange..."
      filtering
      throttle
      actions={
        <ActionPanel>
          <Action title={showingDetails ? 'Hide Details' : 'Show Details'} icon={showingDetails ? Icon.EyeDisabled : Icon.Eye} onAction={() => setShowDetails(x => !x)} />
        </ActionPanel>
      }
    >
      {!isLoading && error && (
        <List.EmptyView title="Error while looking up positions" icon={{ source: 'list-icon.png', mask: Image.Mask.RoundedRectangle }} description={error.message} />
      )}
      {!isLoading && !error && positions.length === 0 && (
        <List.EmptyView title="No positions found" icon={{ source: 'list-icon.png', mask: Image.Mask.RoundedRectangle }} description="Looked up open positions" />
      )}
      {positions.map(position => (
        <List.Item
          icon={{ source: 'list-icon.png', mask: Image.Mask.RoundedRectangle }}
          key={position.asset_id}
          title={position.symbol}
          keywords={[position.asset_class, position.symbol, position.side, position.exchange]}
          subtitle={position.exchange}
          accessories={
            showingDetails
              ? [
                  { text: `${Number(position.qty).toFixed(1)}`, icon: { source: Icon.Stars, tintColor: Color.Blue } },
                  { icon: { source: Icon.CircleFilled, tintColor: position.side === 'long' ? Color.Green : Color.Red }, tooltip: position.side },
                ]
              : [
                  { text: `${Number(position.qty).toFixed(1)}`, icon: { source: Icon.Stars, tintColor: Color.Blue } },
                  { tag: asDollarAmt(position.avg_entry_price, 3), icon: Icon.AtSymbol, tooltip: `Market Value: ${asDollarAmt(position.market_value, 3)}` },
                  {
                    tag: { value: asDollarAmt(position.unrealized_pl, 3), color: Number(position.unrealized_pl) > 0 ? Color.Green : Color.Red },
                    icon: Number(position.unrealized_pl) > 0 ? Icon.ChevronUp : Icon.ChevronDown,
                    tooltip: asPercentage(position.unrealized_plpc, 3),
                  },
                  { icon: { source: Icon.CircleFilled, tintColor: position.side === 'long' ? Color.Green : Color.Red }, tooltip: position.side },
                ]
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link title="Symbol" text={position.symbol} target={`https://app.alpaca.markets/trade/${position.symbol}`} />
                  <List.Item.Detail.Metadata.TagList title="Asset Class / Exchange">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={position.asset_class.replaceAll('_', ' ')}
                      icon={getAssetImage(position.asset_class) ?? getAssetImage('us_equity')}
                      color={Color.Orange}
                    />
                    <List.Item.Detail.Metadata.TagList.Item text={position.exchange} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label
                    title={`${Number(position.qty_available).toFixed(1)}/${Number(position.qty).toFixed(1)} qty available @ avg. price`}
                    text={asDollarAmt(position.avg_entry_price, 3)}
                  />
                  <List.Item.Detail.Metadata.Label title="Market Value" text={asDollarAmt(position.market_value, 3)} icon={{ source: Icon.Coin, tintColor: Color.Yellow }} />
                  <List.Item.Detail.Metadata.Label title="Cost Basis" text={asDollarAmt(position.cost_basis, 3)} icon={{ source: Icon.Coin, tintColor: Color.Yellow }} />
                  <List.Item.Detail.Metadata.TagList title="Side">
                    <List.Item.Detail.Metadata.TagList.Item text={position.side.toUpperCase()} color={position.side === 'long' ? Color.Green : Color.Red} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Total PL">
                    <List.Item.Detail.Metadata.TagList.Item text={asDollarAmt(position.unrealized_pl, 3)} color={Number(position.unrealized_pl) > 0 ? Color.Green : Color.Red} />
                    <List.Item.Detail.Metadata.TagList.Item
                      text={asPercentage(position.unrealized_plpc, 3)}
                      color={Number(position.unrealized_plpc) > 0 ? Color.Green : Color.Red}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label
                    title="Change Today"
                    text={asPercentage(position.change_today, 3)}
                    icon={{ source: Icon.Bolt, tintColor: Number(position.change_today) > 0 ? Color.Green : Color.Red }}
                  />
                  <List.Item.Detail.Metadata.TagList title="Intraday PL">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={asDollarAmt(position.unrealized_intraday_pl, 3)}
                      color={Number(position.unrealized_intraday_pl) > 0 ? Color.Green : Color.Red}
                    />
                    <List.Item.Detail.Metadata.TagList.Item
                      text={asPercentage(position.unrealized_intraday_plpc, 3)}
                      color={Number(position.unrealized_intraday_plpc) > 0 ? Color.Green : Color.Red}
                    />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Alpaca" url={`https://app.alpaca.markets/trade/${position.symbol}`} icon={Icon.Link} />
              <Action title={showingDetails ? 'Hide Details' : 'Show Details'} icon={showingDetails ? Icon.EyeDisabled : Icon.Eye} onAction={() => setShowDetails(x => !x)} />
              <Action.CopyToClipboard title="Copy Details JSON" content={JSON.stringify(position, null, 2)} shortcut={{ modifiers: ['cmd', 'shift'], key: '.' }} />
              <ActionPanel.Section title="Management">
                <Action.Push
                  title="Close Position"
                  icon={{ source: Icon.TackDisabled, tintColor: Color.Red }}
                  target={<ClosePositionForm position={position} pop={pop} revalidate={revalidate} />}
                  shortcut={{ modifiers: ['ctrl'], key: 'x' }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
