import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  getCoinmFuturesWalletData,
  getIsolatedMarginWalletData,
  getMarginWalletData,
  getPricePrecisionSync,
  getQuoteAssetSync,
  getSpotWalletData,
  getUsdmFuturesWalletData,
  IsolatedMarginPairPosition,
} from "./api";
import { MARGIN_LEVEL_INFINITY, WALLET_OPTIONS } from "./constants";
import {
  hasPair,
  IsolatedMarginWalletAsset,
  MarginPosition,
  WalletAsset,
  WalletPosition,
  WalletSummary,
  WalletType,
} from "./types";
import { formatAmount } from "./utils";

// ============ Types & Constants ============

interface WalletData {
  assets: WalletAsset[];
  positions?: WalletPosition[];
  marginPositions?: MarginPosition[];
  isolatedMarginPositions?: IsolatedMarginPairPosition[];
  summary: WalletSummary;
}

// ============ Helper Functions ============

async function fetchWalletData(walletType: WalletType): Promise<WalletData> {
  switch (walletType) {
    case "spot":
      return getSpotWalletData();
    case "cross-margin":
      return getMarginWalletData();
    case "isolated-margin": {
      const data = await getIsolatedMarginWalletData();
      return {
        assets: data.assets,
        isolatedMarginPositions: data.marginPositions,
        summary: data.summary,
      };
    }
    case "usdm-futures":
      return getUsdmFuturesWalletData();
    case "coinm-futures":
      return getCoinmFuturesWalletData();
    default:
      throw new Error(`Unknown wallet type: ${walletType}`);
  }
}

function getBinanceUrl(asset: string, walletType: WalletType): string {
  switch (walletType) {
    case "spot":
      return `https://www.binance.com/en/my/wallet/account/main`;
    case "cross-margin":
      return `https://www.binance.com/en/my/wallet/account/margin/cross`;
    case "isolated-margin":
      return `https://www.binance.com/en/my/wallet/account/margin/isolated`;
    case "usdm-futures":
      return `https://www.binance.com/en/my/wallet/account/futures`;
    case "coinm-futures":
      return `https://www.binance.com/en/my/wallet/account/futures/delivery`;
    default:
      return "https://www.binance.com/en/my/wallet/account/overview";
  }
}

function getAssetDetail(asset: WalletAsset, walletType: WalletType): React.ReactNode {
  const Metadata = List.Item.Detail.Metadata;

  if (walletType === "spot") {
    const free = parseFloat(asset.free);
    const locked = parseFloat(asset.locked);
    const total = free + locked;

    return (
      <Metadata>
        <Metadata.Label title="Asset" text={{ value: asset.asset, color: Color.SecondaryText }} />
        <Metadata.Separator />
        <Metadata.Label
          title="Available"
          text={{ value: formatAmount(asset.free, { type: "number" }), color: Color.SecondaryText }}
        />
        <Metadata.Label
          title="Locked"
          text={{ value: formatAmount(asset.locked, { type: "number" }), color: Color.SecondaryText }}
        />
        <Metadata.Separator />
        <Metadata.Label
          title="Total"
          text={{ value: formatAmount(total.toString(), { type: "number" }), color: Color.SecondaryText }}
        />
      </Metadata>
    );
  }

  if (walletType === "cross-margin") {
    const borrowed = parseFloat(asset.borrowed || "0");
    const interest = parseFloat(asset.interest || "0");
    const netAsset = parseFloat(asset.netAsset || "0");

    return (
      <Metadata>
        <Metadata.Label title="Asset" text={{ value: asset.asset, color: Color.SecondaryText }} />
        <Metadata.Separator />
        <Metadata.Label
          title="Available"
          text={{ value: formatAmount(asset.free, { type: "number" }), color: Color.SecondaryText }}
        />
        <Metadata.Label
          title="Locked"
          text={{ value: formatAmount(asset.locked, { type: "number" }), color: Color.SecondaryText }}
        />
        <Metadata.Separator />
        <Metadata.Label
          title="Borrowed"
          text={{
            value: formatAmount(asset.borrowed, { type: "number" }),
            color: borrowed > 0 ? Color.Orange : Color.SecondaryText,
          }}
        />
        <Metadata.Label
          title="Interest"
          text={{
            value: formatAmount(asset.interest, { type: "number" }),
            color: interest > 0 ? Color.Red : Color.SecondaryText,
          }}
        />
        <Metadata.Separator />
        <Metadata.Label
          title="Net Asset"
          text={{
            value: formatAmount(asset.netAsset, { type: "number" }),
            color: netAsset > 0 ? Color.Green : netAsset < 0 ? Color.Red : Color.SecondaryText,
          }}
        />
      </Metadata>
    );
  }

  if (walletType === "isolated-margin") {
    const borrowed = parseFloat(asset.borrowed || "0");
    const interest = parseFloat(asset.interest || "0");
    const netAsset = parseFloat(asset.netAsset || "0");
    const isolatedAsset = asset as IsolatedMarginWalletAsset;

    return (
      <Metadata>
        <Metadata.Label title="Pair" text={{ value: isolatedAsset.symbol || "", color: Color.SecondaryText }} />
        <Metadata.Label title="Asset" text={{ value: asset.asset, color: Color.SecondaryText }} />
        <Metadata.Separator />
        <Metadata.Label
          title="Available"
          text={{ value: formatAmount(asset.free, { type: "number" }), color: Color.SecondaryText }}
        />
        <Metadata.Label
          title="Locked"
          text={{ value: formatAmount(asset.locked, { type: "number" }), color: Color.SecondaryText }}
        />
        <Metadata.Separator />
        <Metadata.Label
          title="Borrowed"
          text={{
            value: formatAmount(asset.borrowed, { type: "number" }),
            color: borrowed > 0 ? Color.Orange : Color.SecondaryText,
          }}
        />
        <Metadata.Label
          title="Interest"
          text={{
            value: formatAmount(asset.interest, { type: "number" }),
            color: interest > 0 ? Color.Red : Color.SecondaryText,
          }}
        />
        <Metadata.Separator />
        <Metadata.Label
          title="Net Asset"
          text={{
            value: formatAmount(asset.netAsset, { type: "number" }),
            color: netAsset >= 0 ? Color.Green : Color.Red,
          }}
        />
      </Metadata>
    );
  }

  // Futures wallets (USD-M and COIN-M)
  const pnl = parseFloat(asset.unrealizedPnl || "0");

  return (
    <Metadata>
      <Metadata.Label title="Asset" text={{ value: asset.asset, color: Color.SecondaryText }} />
      <Metadata.Separator />
      <Metadata.Label
        title="Wallet Balance"
        text={{
          value: formatAmount(asset.walletBalance, { type: "price", precision: 8 }),
          color: Color.SecondaryText,
        }}
      />
      <Metadata.Label
        title="Margin Balance"
        text={{
          value: formatAmount(asset.marginBalance, { type: "price", precision: 8 }),
          color: Color.SecondaryText,
        }}
      />
      <Metadata.Label
        title="Available for Transfer"
        text={{
          value: formatAmount(asset.availableBalance, { type: "price", precision: 8 }),
          color: Color.SecondaryText,
        }}
      />
      <Metadata.Separator />
      <Metadata.Label
        title="Unrealized PNL"
        text={{
          value: formatAmount(asset.unrealizedPnl, { type: "price", precision: 8 }),
          color: pnl > 0 ? Color.Green : pnl < 0 ? Color.Red : Color.SecondaryText,
        }}
      />
    </Metadata>
  );
}

function getPositionSide(position: WalletPosition): "Long" | "Short" {
  // In One-way mode, positionSide is "BOTH" - determine side from size
  // In Hedge mode, positionSide is "LONG" or "SHORT"
  if (position.positionSide === "BOTH") {
    return parseFloat(position.size) >= 0 ? "Long" : "Short";
  }
  return position.positionSide === "LONG" ? "Long" : "Short";
}

function getFuturesPositionDetail(position: WalletPosition, walletType: WalletType): React.ReactNode {
  const Metadata = List.Item.Detail.Metadata;
  const pnl = parseFloat(position.unrealizedPnl);
  const roe = parseFloat(position.roe || "0");
  const side = getPositionSide(position);
  const marginTypeLabel = position.marginType === "cross" ? "Cross" : "Isolated";

  // Use pre-calculated margin ratio from API
  const marginRatio = parseFloat(position.marginRatio || "0");

  // Get price precision from cache (uses spot equivalent for futures symbols)
  const pricePrecision = getPricePrecisionSync(position.symbol);

  // For COIN-M: show contracts, for USD-M: show notional in quote asset
  const isCoinM = walletType === "coinm-futures";

  // Get collateral/margin asset from exchangeInfo cache
  // USD-M: returns quote asset (USDT, USDC, etc.)
  // COIN-M: returns base asset (BTC, ETH, etc.) as collateral
  const collateralAsset = getQuoteAssetSync(position.symbol) || (isCoinM ? "BTC" : "USDT");

  const sizeValue = isCoinM
    ? `${Math.abs(parseFloat(position.size))} Cont`
    : `${formatAmount(Math.abs(parseFloat(position.notional || "0")).toString(), { type: "price", precision: 2 })} ${collateralAsset}`;

  // Format margin/pnl values based on wallet type
  const formatMarginValue = (value: string | undefined) => {
    return formatAmount(value, { type: "crypto", asset: collateralAsset });
  };

  return (
    <Metadata>
      <Metadata.Label title="Symbol" text={{ value: position.symbol, color: Color.SecondaryText }} />
      <Metadata.TagList title="Side">
        <Metadata.TagList.Item text={`${marginTypeLabel} ${side}`} color={side === "Long" ? Color.Green : Color.Red} />
      </Metadata.TagList>
      <Metadata.TagList title="Leverage">
        <Metadata.TagList.Item text={`${position.leverage}x`} />
      </Metadata.TagList>
      <Metadata.Separator />
      <Metadata.Label title="Size" text={{ value: sizeValue, color: Color.SecondaryText }} />
      <Metadata.Label
        title="Entry Price"
        text={{
          value: formatAmount(position.entryPrice, { type: "price", precision: pricePrecision }),
          color: Color.SecondaryText,
        }}
      />
      <Metadata.Label
        title="Break Even Price"
        text={{
          value: formatAmount(position.breakEvenPrice, { type: "price", precision: pricePrecision }),
          color: Color.SecondaryText,
        }}
      />
      <Metadata.Label
        title="Mark Price"
        text={{
          value: formatAmount(position.markPrice, { type: "price", precision: pricePrecision }),
          color: Color.SecondaryText,
        }}
      />
      <Metadata.Label
        title="Liquidation Price"
        text={{
          value: formatAmount(position.liquidationPrice, { type: "price", precision: pricePrecision }),
          color: Color.Orange,
        }}
      />
      <Metadata.Label
        title="Margin Ratio"
        text={{
          value: `${marginRatio.toFixed(2)}%`,
          color: marginRatio < 50 ? Color.Green : marginRatio < 80 ? Color.Orange : Color.Red,
        }}
      />
      <Metadata.Label
        title="Margin"
        text={{
          value: formatMarginValue(position.margin),
          color: Color.SecondaryText,
        }}
      />
      <Metadata.Separator />
      <Metadata.Label
        title="Unrealized PNL"
        text={{
          value: formatMarginValue(position.unrealizedPnl),
          color: pnl >= 0 ? Color.Green : Color.Red,
        }}
      />
      <Metadata.Label
        title="ROE"
        text={{
          value: `${position.roe}%`,
          color: roe >= 0 ? Color.Green : Color.Red,
        }}
      />
    </Metadata>
  );
}

// ============ Components ============

function WalletDropdown(props: { onWalletChange: (wallet: WalletType) => void }) {
  return (
    <List.Dropdown
      tooltip="Select Wallet"
      storeValue={true}
      onChange={(value) => props.onWalletChange(value as WalletType)}
    >
      <List.Dropdown.Section title="Wallets">
        {WALLET_OPTIONS.map((option) => (
          <List.Dropdown.Item key={option.id} title={option.name} value={option.id} icon={Icon.Wallet} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function AssetListItem(props: { asset: WalletAsset; walletType: WalletType; onRefresh: () => void }) {
  const { asset, walletType, onRefresh } = props;

  // Subtitle shows the main balance
  let subtitle = "";
  if (walletType === "spot") {
    const free = parseFloat(asset.free);
    const locked = parseFloat(asset.locked);
    subtitle = formatAmount((free + locked).toString(), { type: "crypto", asset: asset.asset });
  } else if (walletType === "cross-margin" || walletType === "isolated-margin") {
    subtitle = formatAmount(asset.netAsset, { type: "crypto", asset: asset.asset });
  } else {
    // Futures wallets - balances are in stablecoins (USDT/BUSD)
    subtitle = formatAmount(asset.marginBalance, { type: "price", precision: 2 });
  }

  return (
    <List.Item
      title={asset.asset}
      subtitle={subtitle}
      icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
      detail={<List.Item.Detail metadata={getAssetDetail(asset, walletType)} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Wallet in Browser" url={getBinanceUrl(asset.asset, walletType)} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
          <Action.CopyToClipboard title="Copy Balance" content={subtitle} shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel>
      }
    />
  );
}

function FuturesPositionListItem(props: { position: WalletPosition; walletType: WalletType; onRefresh: () => void }) {
  const { position, walletType, onRefresh } = props;

  return (
    <List.Item
      title={position.symbol}
      subtitle={`${position.roe}%`}
      icon={{ source: Icon.LineChart, tintColor: Color.Yellow }}
      detail={<List.Item.Detail metadata={getFuturesPositionDetail(position, walletType)} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Wallet in Browser" url={getBinanceUrl(position.symbol, walletType)} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
          <Action.CopyToClipboard
            title="Copy Symbol"
            content={position.symbol}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

function getMarginPositionDetail(position: MarginPosition, isIsolated: boolean): React.ReactNode {
  const Metadata = List.Item.Detail.Metadata;
  const positionValue = parseFloat(position.position);
  const marginLevel = position.marginLevel ? parseFloat(position.marginLevel) : 0;

  // Get price precision from cache (use pair for isolated, or asset+USDT for cross)
  const symbol = position.pair || `${position.asset}USDT`;
  const pricePrecision = getPricePrecisionSync(symbol);

  return (
    <Metadata>
      {isIsolated && hasPair(position) && <Metadata.Label title="Pair" text={position.pair} />}
      <Metadata.Label title="Coin" text={position.asset} />
      <Metadata.Separator />
      <Metadata.Label
        title="Position"
        text={{
          value: formatAmount(position.position, { type: "number" }),
          color: positionValue >= 0 ? Color.Green : Color.Red,
        }}
      />
      <Metadata.Label
        title="Position Value"
        text={`${formatAmount(position.positionValue, { type: "price", precision: pricePrecision })} USDT`}
      />
      <Metadata.Label
        title="Index Price"
        text={`${formatAmount(position.indexPrice, { type: "price", precision: pricePrecision })} USDT`}
      />
      {isIsolated && marginLevel > 0 && marginLevel < MARGIN_LEVEL_INFINITY && (
        <>
          <Metadata.Separator />
          <Metadata.Label
            title="Margin Level"
            text={{
              value: marginLevel.toFixed(2),
              color: marginLevel > 2 ? Color.Green : marginLevel > 1.3 ? Color.Orange : Color.Red,
            }}
          />
        </>
      )}
    </Metadata>
  );
}

function MarginPositionListItem(props: { position: MarginPosition; walletType: WalletType; onRefresh: () => void }) {
  const { position, walletType, onRefresh } = props;

  return (
    <List.Item
      key={position.asset}
      title={position.asset}
      subtitle={formatAmount(position.position, { type: "number" })}
      icon={{ source: Icon.LineChart, tintColor: Color.Yellow }}
      detail={<List.Item.Detail metadata={getMarginPositionDetail(position, false)} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Wallet in Browser" url={getBinanceUrl(position.asset, walletType)} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
          <Action.CopyToClipboard
            title="Copy Position Value"
            content={position.positionValue}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

function getIsolatedMarginPairDetail(position: IsolatedMarginPairPosition): React.ReactNode {
  const Metadata = List.Item.Detail.Metadata;
  const marginLevel = parseFloat(position.marginLevel);
  const baseNetAsset = parseFloat(position.baseAsset.netAsset);
  const quoteNetAsset = parseFloat(position.quoteAsset.netAsset);
  const totalValue = parseFloat(position.baseAsset.positionValue) + parseFloat(position.quoteAsset.positionValue);
  const baseAssetSymbol = position.baseAsset.asset; // e.g., "BTC"

  // Get price precision from cache
  const pricePrecision = getPricePrecisionSync(position.pair);

  // Calculate "To Liquidation Price" percentage
  const indexPrice = parseFloat(position.indexPrice);
  const liquidationPrice = parseFloat(position.liquidationPrice);
  const toLiquidationPercent =
    indexPrice > 0 && liquidationPrice > 0 ? ((indexPrice - liquidationPrice) / indexPrice) * 100 : 0;

  return (
    <Metadata>
      <Metadata.Label title="Pair" text={position.pair} />
      <Metadata.Label
        title="Index Price"
        text={`${formatAmount(position.indexPrice, { type: "price", precision: pricePrecision })} USDT`}
      />
      <Metadata.Label
        title="Liquidation Price"
        text={{
          value: `${formatAmount(position.liquidationPrice, { type: "price", precision: pricePrecision })} USDT`,
          color: Color.Orange,
        }}
      />
      {liquidationPrice > 0 && (
        <Metadata.Label
          title="To Liquidation Price"
          text={{
            value: `${toLiquidationPercent >= 0 ? "-" : "+"}${Math.abs(toLiquidationPercent).toFixed(2)}%`,
            color:
              Math.abs(toLiquidationPercent) < 10
                ? Color.Red
                : Math.abs(toLiquidationPercent) < 30
                  ? Color.Orange
                  : Color.Green,
          }}
        />
      )}
      <Metadata.Separator />
      <Metadata.Label title={position.baseAsset.asset} text="" />
      <Metadata.Label
        title="  Position"
        text={{
          value: formatAmount(position.baseAsset.netAsset, { type: "number" }),
          color: baseNetAsset >= 0 ? Color.Green : Color.Red,
        }}
      />
      <Metadata.Label
        title="  Value"
        text={`${formatAmount(position.baseAsset.positionValue, { type: "number" })} ${baseAssetSymbol}`}
      />
      <Metadata.Separator />
      <Metadata.Label title={position.quoteAsset.asset} text="" />
      <Metadata.Label
        title="  Position"
        text={{
          value: formatAmount(position.quoteAsset.netAsset, { type: "number" }),
          color: quoteNetAsset >= 0 ? Color.Green : Color.Red,
        }}
      />
      <Metadata.Label
        title="  Value"
        text={`${formatAmount(position.quoteAsset.positionValue, { type: "number" })} ${baseAssetSymbol}`}
      />
      <Metadata.Separator />
      <Metadata.Label
        title="Total Value"
        text={`${formatAmount(totalValue, { type: "crypto", asset: baseAssetSymbol })} ${baseAssetSymbol}`}
      />
      {marginLevel > 0 && marginLevel < MARGIN_LEVEL_INFINITY && (
        <Metadata.Label
          title="Margin Level"
          text={{
            value: marginLevel.toFixed(2),
            color: marginLevel > 2 ? Color.Green : marginLevel > 1.3 ? Color.Orange : Color.Red,
          }}
        />
      )}
    </Metadata>
  );
}

function IsolatedMarginPairListItem(props: { position: IsolatedMarginPairPosition; onRefresh: () => void }) {
  const { position, onRefresh } = props;
  const totalValue = parseFloat(position.baseAsset.positionValue) + parseFloat(position.quoteAsset.positionValue);
  const baseAssetSymbol = position.baseAsset.asset;

  return (
    <List.Item
      key={position.pair}
      title={position.pair}
      subtitle={`${formatAmount(totalValue, { type: "crypto", asset: baseAssetSymbol })} ${baseAssetSymbol}`}
      icon={{ source: Icon.LineChart, tintColor: Color.Yellow }}
      detail={<List.Item.Detail metadata={getIsolatedMarginPairDetail(position)} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Wallet in Browser" url={getBinanceUrl("", "isolated-margin")} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
          <Action.CopyToClipboard
            title="Copy Total Value"
            content={totalValue.toFixed(8)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

// ============ Main Command ============

export default function MyWallet() {
  const [walletType, setWalletType] = useState<WalletType>("spot");

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (wallet: WalletType) => fetchWalletData(wallet),
    [walletType],
    {
      keepPreviousData: true,
      onError: async (err) => {
        const message = err.message || "Unknown error";

        if (message.includes("Invalid API-key") || message.includes("Signature")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid API Credentials",
            message: "Please check your API key and secret in preferences",
            primaryAction: {
              title: "Open Preferences",
              onAction: () => openExtensionPreferences(),
            },
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch wallet data",
            message: message,
          });
        }
      },
    },
  );

  const walletName = WALLET_OPTIONS.find((w) => w.id === walletType)?.name || "Wallet";

  // Build subtitle for the section header
  const sectionSubtitle = data?.summary ? `≈ ${formatAmount(data.summary.totalBalanceUsd, { type: "usd" })}` : "";

  // Margin level for Cross Margin
  const marginLevel = data?.summary?.marginLevel;
  const marginLevelNum = marginLevel ? parseFloat(marginLevel) : 0;
  const hasMarginLevel = walletType === "cross-margin" && marginLevel && marginLevelNum < MARGIN_LEVEL_INFINITY;

  const getMarginLevelColor = (level: number): Color => {
    if (level > 2) return Color.Green;
    if (level > 1.3) return Color.Orange;
    return Color.Red;
  };

  const isFuturesWallet = walletType === "usdm-futures" || walletType === "coinm-futures";
  const isMarginWallet = walletType === "cross-margin" || walletType === "isolated-margin";
  const hasPositions = isFuturesWallet && data?.positions && data.positions.length > 0;
  const hasMarginPositions = walletType === "cross-margin" && data?.marginPositions && data.marginPositions.length > 0;
  const hasIsolatedMarginPositions =
    walletType === "isolated-margin" && data?.isolatedMarginPositions && data.isolatedMarginPositions.length > 0;

  // Determine section title based on wallet type
  const getSectionTitle = () => {
    if (isFuturesWallet) return "Assets";
    if (isMarginWallet) return "Funds";
    return walletName;
  };

  // Determine search bar placeholder based on wallet type
  const getSearchBarPlaceholder = () => {
    if (isFuturesWallet) return "Filter by asset or symbol";
    if (isMarginWallet) return "Filter by coin or pair";
    return "Filter by coin";
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={getSearchBarPlaceholder()}
      searchBarAccessory={<WalletDropdown onWalletChange={setWalletType} />}
    >
      {error && !data ? (
        <List.EmptyView
          title="Failed to load wallet"
          description={error.message}
          icon={{ source: "logo.svg", tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : data?.assets.length === 0 && !hasPositions && !hasMarginPositions && !hasIsolatedMarginPositions ? (
        <List.EmptyView
          title="No assets found"
          description={`Empty ${walletName} wallet`}
          icon={{ source: "logo.svg", tintColor: Color.SecondaryText }}
        />
      ) : (
        <>
          {hasPositions && (
            <List.Section title="Positions">
              {data.positions!.map((position) => (
                <FuturesPositionListItem
                  key={position.symbol + position.positionSide}
                  position={position}
                  walletType={walletType}
                  onRefresh={revalidate}
                />
              ))}
            </List.Section>
          )}
          {hasMarginPositions && (
            <List.Section title="Positions">
              {data.marginPositions!.map((position) => (
                <MarginPositionListItem
                  key={position.asset}
                  position={position}
                  walletType={walletType}
                  onRefresh={revalidate}
                />
              ))}
            </List.Section>
          )}
          {hasIsolatedMarginPositions && (
            <List.Section title="Positions">
              {data.isolatedMarginPositions!.map((position) => (
                <IsolatedMarginPairListItem key={position.pair} position={position} onRefresh={revalidate} />
              ))}
            </List.Section>
          )}
          <List.Section title={getSectionTitle()} subtitle={sectionSubtitle}>
            {data?.assets.map((asset, index) => {
              // For isolated margin, same asset can appear in multiple pairs
              const key =
                walletType === "isolated-margin" && "symbol" in asset
                  ? `${(asset as { symbol: string }).symbol}-${asset.asset}`
                  : `${asset.asset}-${index}`;
              return <AssetListItem key={key} asset={asset} walletType={walletType} onRefresh={revalidate} />;
            })}
          </List.Section>
          {hasMarginLevel && (
            <List.Section title="Margin Level">
              <List.Item
                title={marginLevelNum.toFixed(2)}
                icon={{ source: Icon.Gauge, tintColor: getMarginLevelColor(marginLevelNum) }}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open Wallet in Browser" url={getBinanceUrl("", walletType)} />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
