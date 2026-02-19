import {
  Color,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getCoinmFuturesWalletData,
  getIsolatedMarginWalletData,
  getMarginWalletData,
  getSpotWalletData,
  getTickerPrices,
  getTotalPortfolioBalance,
  getUsdmFuturesWalletData,
  IsolatedMarginPairPosition,
} from "./api";
import { MARGIN_LEVEL_INFINITY, WALLET_NAMES } from "./constants";
import { MarginPosition, WalletAsset, WalletPosition, WalletType } from "./types";
import { formatAmount } from "./utils";

// ============ Types & Constants ============

interface AssetInfo {
  asset: string;
  balance: string;
  valueUsd: number;
}

interface PositionInfo {
  symbol: string;
  size: string;
  pnl: number;
  pnlRaw: string; // Original PnL value (BTC for COIN-M)
  pnlPercent: string;
  side: "long" | "short";
  collateralAsset?: string; // Collateral asset for COIN-M (e.g., ETH, BTC)
}

interface MarginPositionInfo {
  asset: string;
  pair?: string;
  position: string;
  valueUsd: number;
}

interface WalletData {
  type: WalletType;
  name: string;
  balanceUsd: number;
  balanceBtc: number;
  enabled: boolean;
  marginLevel?: string;
  unrealizedPnl?: number;
  unrealizedPnlRaw?: string; // Raw PnL in crypto (for COIN-M)
  topAssets: AssetInfo[];
  positions: PositionInfo[];
  marginPositions: MarginPositionInfo[];
}

// ============ Helper Functions ============

function getEnabledWallets(): WalletType[] {
  const prefs = getPreferenceValues<Preferences.MyWalletMenuBar>();
  const wallets: WalletType[] = [];

  // Default to true if preference is undefined
  if (prefs.showSpot !== false) wallets.push("spot");
  if (prefs.showCrossMargin !== false) wallets.push("cross-margin");
  if (prefs.showIsolatedMargin !== false) wallets.push("isolated-margin");
  if (prefs.showUsdmFutures !== false) wallets.push("usdm-futures");
  if (prefs.showCoinmFutures !== false) wallets.push("coinm-futures");

  return wallets;
}

function extractTopAssets(assets: WalletAsset[], walletType: WalletType, limit = 5): AssetInfo[] {
  return assets.slice(0, limit).map((asset) => {
    let balance = "0";
    if (walletType === "spot") {
      balance = formatAmount(parseFloat(asset.free) + parseFloat(asset.locked), { type: "crypto", asset: asset.asset });
    } else if (walletType === "cross-margin" || walletType === "isolated-margin") {
      balance = formatAmount(asset.netAsset || "0", { type: "crypto", asset: asset.asset });
    } else {
      // Futures wallets - balances are in stablecoins (USDT/BUSD)
      balance = formatAmount(asset.marginBalance || "0", { type: "price", precision: 2 });
    }
    return {
      asset: asset.asset,
      balance,
      valueUsd: 0, // We don't have USD value per asset in the current data structure
    };
  });
}

function extractPositions(positions: WalletPosition[]): PositionInfo[] {
  return positions.map((pos) => {
    // Extract collateral asset from symbol (e.g., "ETHUSD_PERP" -> "ETH", "BTCUSD_PERP" -> "BTC")
    const symbolParts = pos.symbol.split("USD");
    const collateralAsset = symbolParts[0] || undefined;

    return {
      symbol: pos.symbol,
      size: formatAmount(Math.abs(parseFloat(pos.size)), { type: "number" }),
      pnl: parseFloat(pos.unrealizedPnl),
      pnlRaw: pos.unrealizedPnl,
      pnlPercent: pos.roe || "0",
      side: parseFloat(pos.size) > 0 ? "long" : "short",
      collateralAsset,
    };
  });
}

function extractMarginPositions(positions: MarginPosition[]): MarginPositionInfo[] {
  return positions.map((pos) => ({
    asset: pos.asset,
    pair: pos.symbol,
    position: formatAmount(pos.position, { type: "number" }),
    valueUsd: parseFloat(pos.positionValue),
  }));
}

function extractIsolatedMarginPositions(
  positions: IsolatedMarginPairPosition[],
  prices: Map<string, number>,
): MarginPositionInfo[] {
  return positions.map((pos) => {
    // positionValue is in base asset (e.g., BTC), convert to USD
    const totalValueInBaseAsset = parseFloat(pos.baseAsset.positionValue) + parseFloat(pos.quoteAsset.positionValue);
    const baseAssetUsdtPrice = prices.get(`${pos.baseAsset.asset}USDT`) || 0;
    const valueUsd = Math.abs(totalValueInBaseAsset) * baseAssetUsdtPrice;

    return {
      asset: pos.baseAsset.asset,
      pair: pos.pair,
      position: formatAmount(pos.baseAsset.netAsset, { type: "number" }),
      valueUsd,
    };
  });
}

async function fetchAllWalletData(): Promise<WalletData[]> {
  const enabledWallets = getEnabledWallets();

  // Fetch ticker prices once to share across all wallet data fetches
  const prices = await getTickerPrices();

  const fetchPromises = enabledWallets.map(async (walletType): Promise<WalletData> => {
    try {
      switch (walletType) {
        case "spot": {
          const data = await getSpotWalletData(prices);
          return {
            type: walletType,
            name: WALLET_NAMES[walletType],
            balanceUsd: parseFloat(data.summary.totalBalanceUsd),
            balanceBtc: parseFloat(data.summary.totalBalanceBtc || "0"),
            enabled: true,
            topAssets: extractTopAssets(data.assets, walletType),
            positions: [],
            marginPositions: [],
          };
        }
        case "cross-margin": {
          const data = await getMarginWalletData(prices);
          return {
            type: walletType,
            name: WALLET_NAMES[walletType],
            balanceUsd: parseFloat(data.summary.totalBalanceUsd),
            balanceBtc: parseFloat(data.summary.totalBalanceBtc || "0"),
            enabled: true,
            marginLevel: data.summary.marginLevel,
            topAssets: extractTopAssets(data.assets, walletType),
            positions: [],
            marginPositions: extractMarginPositions(data.marginPositions),
          };
        }
        case "isolated-margin": {
          const data = await getIsolatedMarginWalletData(prices);
          return {
            type: walletType,
            name: WALLET_NAMES[walletType],
            balanceUsd: parseFloat(data.summary.totalBalanceUsd),
            balanceBtc: parseFloat(data.summary.totalBalanceBtc || "0"),
            enabled: true,
            topAssets: extractTopAssets(data.assets, walletType),
            positions: [],
            marginPositions: extractIsolatedMarginPositions(data.marginPositions, prices),
          };
        }
        case "usdm-futures": {
          const data = await getUsdmFuturesWalletData(prices);
          return {
            type: walletType,
            name: WALLET_NAMES[walletType],
            balanceUsd: parseFloat(data.summary.totalBalanceUsd),
            balanceBtc: parseFloat(data.summary.totalBalanceBtc || "0"),
            enabled: true,
            unrealizedPnl: parseFloat(data.summary.unrealizedPnl || "0"),
            topAssets: extractTopAssets(data.assets, walletType),
            positions: data.positions ? extractPositions(data.positions) : [],
            marginPositions: [],
          };
        }
        case "coinm-futures": {
          const data = await getCoinmFuturesWalletData(prices);
          return {
            type: walletType,
            name: WALLET_NAMES[walletType],
            balanceUsd: parseFloat(data.summary.totalBalanceUsd),
            balanceBtc: parseFloat(data.summary.totalBalanceBtc || "0"),
            enabled: true,
            unrealizedPnl: parseFloat(data.summary.unrealizedPnl || "0"),
            unrealizedPnlRaw: data.summary.unrealizedPnlRaw,
            topAssets: extractTopAssets(data.assets, walletType),
            positions: data.positions ? extractPositions(data.positions) : [],
            marginPositions: [],
          };
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${walletType} wallet:`, error);
      return {
        type: walletType,
        name: WALLET_NAMES[walletType],
        balanceUsd: 0,
        balanceBtc: 0,
        enabled: false,
        topAssets: [],
        positions: [],
        marginPositions: [],
      };
    }
  });

  return Promise.all(fetchPromises);
}

// ============ Components ============

function WalletSubmenu({ wallet }: { wallet: WalletData }) {
  const isFutures = wallet.type === "usdm-futures" || wallet.type === "coinm-futures";
  const isCoinm = wallet.type === "coinm-futures";
  const isMargin = wallet.type === "cross-margin" || wallet.type === "isolated-margin";

  return (
    <MenuBarExtra.Submenu title={wallet.name} icon={Icon.Wallet}>
      {/* Estimated Balance Section */}
      <MenuBarExtra.Section title="Estimated Balance">
        {isCoinm ? (
          // For COIN-M, show total in USD equivalent since each asset is separate collateral
          <MenuBarExtra.Item
            title={`${formatAmount(wallet.balanceBtc.toString(), { type: "crypto", asset: "BTC" })} BTC`}
            subtitle={`≈ ${formatAmount(wallet.balanceUsd, { type: "usd" })}`}
            onAction={() => {}}
          />
        ) : (
          <MenuBarExtra.Item
            title={`${formatAmount(wallet.balanceBtc.toString(), { type: "crypto", asset: "BTC" })} BTC`}
            subtitle={`≈ ${formatAmount(wallet.balanceUsd, { type: "usd" })}`}
            onAction={() => {}}
          />
        )}
        {/* Margin Level for margin wallets */}
        {isMargin && wallet.marginLevel && parseFloat(wallet.marginLevel) < MARGIN_LEVEL_INFINITY && (
          <MenuBarExtra.Item
            title={`Margin Level: ${formatAmount(wallet.marginLevel, { type: "number", precision: 2 })}`}
            icon={Icon.Warning}
            onAction={() => {}}
          />
        )}
      </MenuBarExtra.Section>

      {/* Unrealized PnL Section for futures */}
      {isFutures && wallet.unrealizedPnl !== undefined && (
        <MenuBarExtra.Section title="Unrealized PnL">
          <MenuBarExtra.Item
            title={
              isCoinm && wallet.unrealizedPnlRaw
                ? `${formatAmount(wallet.unrealizedPnlRaw, { type: "crypto", asset: "BTC" })} BTC`
                : formatAmount(wallet.unrealizedPnl, { type: "usd" })
            }
            subtitle={isCoinm ? `≈ ${formatAmount(wallet.unrealizedPnl, { type: "usd" })}` : undefined}
            onAction={() => {}}
          />
        </MenuBarExtra.Section>
      )}

      {/* Futures Positions */}
      {isFutures && wallet.positions.length > 0 && (
        <MenuBarExtra.Section title="Positions">
          {wallet.positions.slice(0, 5).map((pos) => {
            // For COIN-M, show PnL in collateral asset with proper precision; for USD-M, show in USD
            const pnlDisplay =
              isCoinm && pos.collateralAsset
                ? `${formatAmount(pos.pnlRaw, { type: "crypto", asset: pos.collateralAsset })} ${pos.collateralAsset}`
                : formatAmount(pos.pnl, { type: "usd" });
            return (
              <MenuBarExtra.Item
                key={pos.symbol}
                title={`${pos.symbol} ${pos.side === "long" ? "(Long)" : "(Short)"}`}
                subtitle={`${pnlDisplay} (${pos.pnlPercent}%)`}
                onAction={() => {}}
              />
            );
          })}
        </MenuBarExtra.Section>
      )}

      {/* Margin Positions */}
      {isMargin && wallet.marginPositions.length > 0 && (
        <MenuBarExtra.Section title="Positions">
          {wallet.marginPositions.slice(0, 5).map((pos, idx) => (
            <MenuBarExtra.Item
              key={`${pos.pair || pos.asset}-${idx}`}
              title={pos.pair ? `${pos.pair} (${pos.asset})` : pos.asset}
              subtitle={`${pos.position} ≈ ${formatAmount(pos.valueUsd, { type: "usd" })}`}
              onAction={() => {}}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {/* Top Assets */}
      {wallet.topAssets.length > 0 && (
        <MenuBarExtra.Section title={isFutures ? "Assets" : isMargin ? "Funds" : "Top Assets"}>
          {wallet.topAssets.map((asset) => (
            <MenuBarExtra.Item key={asset.asset} title={asset.asset} subtitle={asset.balance} onAction={() => {}} />
          ))}
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra.Submenu>
  );
}

// ============ Main Command ============

export default function MyWalletMenuBar() {
  // Fetch total portfolio balance (single optimized call)
  const {
    data: portfolio,
    isLoading: isLoadingPortfolio,
    error: portfolioError,
  } = useCachedPromise(getTotalPortfolioBalance, [], { keepPreviousData: true });

  // Fetch detailed wallet data for submenus
  const {
    data: wallets,
    isLoading: isLoadingWallets,
    error: walletsError,
  } = useCachedPromise(fetchAllWalletData, [], { keepPreviousData: true });

  const isLoading = isLoadingPortfolio || isLoadingWallets;
  const enabledWallets = wallets?.filter((w) => w.enabled) ?? [];
  const hasError = portfolioError || walletsError || (wallets && enabledWallets.length === 0);

  const totalBalance = portfolio?.totalUsd ?? 0;
  const totalBalanceBtc = portfolio?.totalBtc ?? 0;

  const prefs = getPreferenceValues<Preferences.MyWalletMenuBar>();
  const displayCurrency = prefs.displayCurrency ?? "btc";

  const getMenuBarTitle = (): string | undefined => {
    if (displayCurrency === "icon-only") return undefined;
    if (isLoading && !portfolio) return "Loading…";
    if (hasError) return "Error";
    if (displayCurrency === "btc") {
      return `${formatAmount(totalBalanceBtc.toString(), { type: "crypto", asset: "BTC" })} BTC`;
    }
    return formatAmount(totalBalance, { type: "usd", compact: true });
  };

  return (
    <MenuBarExtra
      icon={{ source: "logo.svg", tintColor: Color.PrimaryText }}
      title={getMenuBarTitle()}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Overview">
        <MenuBarExtra.Item
          title={`${formatAmount(totalBalanceBtc.toString(), { type: "crypto", asset: "BTC" })} BTC`}
          subtitle={`≈ ${formatAmount(totalBalance, { type: "usd" })}`}
          icon={Icon.Crypto}
          onAction={() => open("https://www.binance.com/en/my/wallet/account/overview")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Wallets">
        {enabledWallets.map((wallet) => (
          <WalletSubmenu key={wallet.type} wallet={wallet} />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open My Wallet"
          icon={Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => launchCommand({ name: "my-wallet", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Wallet in Browser"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          onAction={() => open("https://www.binance.com/en/my/wallet/account/overview")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Settings…"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
