import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  Image,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { ReactNode, useEffect, useMemo, useState } from "react";

import { ChartLayout, assetChartMarkdown, portfolioChartMarkdown } from "./charts";
import {
  getLatestQuoteById,
  getLatestQuotesAndConvertedTransactions,
  resolveAsset,
  searchAssets,
} from "./coinmarketcap";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  profitIcon,
  transactionTypeLabel,
} from "./format";
import { calculateSnapshot } from "./portfolio";
import {
  createBackup,
  deletePortfolio,
  deleteTransaction,
  getPortfolios,
  importBackup,
  movePinnedPortfolio,
  getTransactions,
  savePortfolio,
  saveTransaction,
  setPortfolioPinned,
} from "./storage";
import { generatePortfolioReport, serializeBackupForClipboard } from "./report";
import {
  AssetPosition,
  AssetSearchResult,
  CryptoTransaction,
  Portfolio,
  PortfolioSnapshot,
  Preferences,
  Quote,
  TransactionType,
} from "./types";

type WalletData = {
  portfolios: Portfolio[];
  transactions: CryptoTransaction[];
  quotes: Record<string, Quote>;
  isLoading: boolean;
  isLoadingPrices: boolean;
};

type PortfolioFormValues = {
  name: string;
  symbol?: string;
  description?: string;
};

type TransactionFormValues = {
  type: TransactionType;
  assetSymbol: string;
  assetName?: string;
  quantity: string;
  price: string;
  fee?: string;
  date?: string;
  time?: string;
  notes?: string;
};

type ImportBackupFormValues = {
  json: string;
};

const WALLET_EMOJIS = [
  "💼",
  "💰",
  "💸",
  "🏦",
  "📈",
  "📊",
  "🪙",
  "💎",
  "🚀",
  "🌕",
  "🔥",
  "⭐",
  "⚡",
  "🛡️",
  "🔐",
  "🧊",
  "🌱",
  "🏠",
  "🎯",
  "🧠",
  "👑",
  "🧪",
  "🛰️",
  "🌊",
  "🟢",
  "🔵",
  "🟣",
  "🟡",
  "🔴",
  "⚫",
  "⚪",
  "🟠",
] as const;

function parsePositiveNumber(value: string, fieldName: string): number {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }
  return parsed;
}

function parseNonNegativeNumber(value: string | undefined, fieldName: string): number {
  const parsed = Number((value || "0").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} cannot be negative.`);
  }
  return parsed;
}

function defaultDate(value?: string): string {
  const date = value ? new Date(value) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(
    2,
    "0",
  )}`;
}

function quickDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return defaultDate(date.toISOString());
}

function combineDateAndTime(date: string | undefined, time: string | undefined): string {
  const dateText = date?.trim() || defaultDate();
  const dateMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) {
    throw new Error("Date must use YYYY-MM-DD.");
  }

  const result = new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
  if (
    result.getFullYear() !== Number(dateMatch[1]) ||
    result.getMonth() !== Number(dateMatch[2]) - 1 ||
    result.getDate() !== Number(dateMatch[3])
  ) {
    throw new Error("Date is not valid.");
  }

  const match = (time || "").trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    throw new Error("Time must use HH:mm.");
  }

  result.setHours(Number(match[1]), Number(match[2]), 0, 0);

  if (result.getTime() > Date.now() + 60_000) {
    throw new Error("Transaction date cannot be in the future.");
  }

  return result.toISOString();
}

function transactionTypeIcon(type: TransactionType): Image.ImageLike {
  switch (type) {
    case "buy":
      return { source: Icon.ArrowDownCircle, tintColor: Color.Green };
    case "sell":
      return { source: Icon.ArrowUpCircle, tintColor: Color.Red };
    case "transfer_in":
      return { source: Icon.PlusCircle, tintColor: Color.Blue };
    case "transfer_out":
      return { source: Icon.MinusCircle, tintColor: Color.Yellow };
  }
}

function defaultTime(value?: string): string {
  const date = value ? new Date(value) : new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function compactText(value: string | undefined, maxLength = 42): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function assetIcon(position: AssetPosition): Image.ImageLike {
  if (!position.assetId) {
    return Icon.Coins;
  }

  return {
    source: `https://s2.coinmarketcap.com/static/img/coins/64x64/${position.assetId}.png`,
    fallback: Icon.Coins,
    mask: Image.Mask.Circle,
  };
}

async function copyBackupToClipboard(portfolioIds?: string[]) {
  const backup = await createBackup(portfolioIds);
  await Clipboard.copy(serializeBackupForClipboard(backup));
  await showToast({ style: Toast.Style.Success, title: "Backup Copied" });
}

async function copyReportToClipboard(
  portfolios: Portfolio[],
  transactions: CryptoTransaction[],
  quotes: Record<string, Quote>,
  currency: string,
) {
  await Clipboard.copy(generatePortfolioReport(portfolios, transactions, quotes, currency));
  await showToast({ style: Toast.Style.Success, title: "Markdown Report Copied" });
}

function useWalletData(currency: string, revision: number): WalletData {
  const [data, setData] = useState<WalletData>({
    portfolios: [],
    transactions: [],
    quotes: {},
    isLoading: true,
    isLoadingPrices: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setData((current) => ({ ...current, isLoading: true }));
      const [portfolios, transactions] = await Promise.all([getPortfolios(), getTransactions()]);
      if (!isMounted) {
        return;
      }

      setData({ portfolios, transactions, quotes: {}, isLoading: false, isLoadingPrices: true });

      try {
        const pricedData = await getLatestQuotesAndConvertedTransactions(transactions, currency);
        if (isMounted) {
          setData({
            portfolios,
            transactions: pricedData.transactions,
            quotes: pricedData.quotes,
            isLoading: false,
            isLoadingPrices: false,
          });
        }
      } catch (error) {
        if (isMounted) {
          setData({ portfolios, transactions, quotes: {}, isLoading: false, isLoadingPrices: false });
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load CoinMarketCap prices",
          message: error instanceof Error ? error.message : undefined,
        });
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [currency, revision]);

  return data;
}

export default function Command() {
  const { baseCurrency } = getPreferenceValues<Preferences>();
  const [revision, setRevision] = useState(0);
  const data = useWalletData(baseCurrency, revision);

  const snapshots = useMemo(
    () => data.portfolios.map((portfolio) => calculateSnapshot(portfolio, data.transactions, data.quotes)),
    [data.portfolios, data.transactions, data.quotes],
  );

  return (
    <List
      isLoading={data.isLoading || data.isLoadingPrices}
      searchBarPlaceholder="Search portfolios"
      navigationTitle="CryptoWallet"
    >
      <List.EmptyView
        title="No Portfolios"
        description="Create your first simulated crypto portfolio."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Portfolio"
              icon={Icon.Plus}
              target={<PortfolioForm currency={baseCurrency} onSaved={() => setRevision((value) => value + 1)} />}
            />
            <Action.Push
              title="Import Backup"
              icon={Icon.Upload}
              target={<ImportBackupForm onImported={() => setRevision((value) => value + 1)} />}
            />
            <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />

      {snapshots.map((snapshot) => (
        <PortfolioItem
          key={snapshot.portfolio.id}
          snapshot={snapshot}
          currency={baseCurrency}
          portfolios={data.portfolios}
          transactions={data.transactions}
          quotes={data.quotes}
          onChanged={() => setRevision((value) => value + 1)}
          onCreatePortfolio={() => setRevision((value) => value + 1)}
        />
      ))}
    </List>
  );
}

function PortfolioItem(props: {
  snapshot: PortfolioSnapshot;
  currency: string;
  portfolios: Portfolio[];
  transactions: CryptoTransaction[];
  quotes: Record<string, Quote>;
  onChanged: () => void;
  onCreatePortfolio: () => void;
}) {
  const { snapshot, currency, portfolios, transactions, quotes, onChanged, onCreatePortfolio } = props;
  const pnlColor = snapshot.totalPnl >= 0 ? Color.Green : Color.Red;

  return (
    <List.Item
      icon={snapshot.portfolio.emoji || (snapshot.portfolio.pinnedAt ? Icon.Pin : Icon.Folder)}
      title={snapshot.portfolio.name}
      subtitle={snapshot.portfolio.pinnedAt ? "Pinned" : compactText(snapshot.portfolio.description)}
      accessories={[
        { text: formatCurrency(snapshot.totalValue, currency), tooltip: "Current value" },
        {
          text: `${profitIcon(snapshot.totalPnl)} ${formatCurrency(snapshot.totalPnl, currency)} · ${formatPercent(
            snapshot.totalPnlPercent,
          )}`,
          tooltip: "Total profit/loss",
          icon: { source: Icon.Circle, tintColor: pnlColor },
        },
        { text: `${snapshot.positions.length} assets` },
      ]}
      actions={
        <PortfolioActions
          portfolio={snapshot.portfolio}
          currency={currency}
          portfolios={portfolios}
          transactions={transactions}
          quotes={quotes}
          onChanged={onChanged}
          onCreatePortfolio={onCreatePortfolio}
        />
      }
    />
  );
}

function PortfolioActions(props: {
  portfolio: Portfolio;
  currency: string;
  portfolios: Portfolio[];
  transactions: CryptoTransaction[];
  quotes: Record<string, Quote>;
  onChanged: () => void;
  onCreatePortfolio: () => void;
}) {
  const { portfolio, currency, portfolios, transactions, quotes, onChanged, onCreatePortfolio } = props;

  return (
    <ActionPanel>
      <ActionPanel.Section title="Portfolio">
        <Action.Push
          title="Open Portfolio"
          icon={Icon.List}
          target={<PortfolioView portfolio={portfolio} currency={currency} onChanged={onChanged} />}
        />
        <Action.Push
          title="Add Transaction"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<TransactionForm portfolio={portfolio} currency={currency} onSaved={onChanged} />}
        />
        <Action title="Refresh Prices" icon={Icon.ArrowClockwise} onAction={onChanged} />
        <Action
          title={portfolio.pinnedAt ? "Unpin Portfolio" : "Pin Portfolio"}
          icon={Icon.Pin}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={async () => {
            await setPortfolioPinned(portfolio.id, !portfolio.pinnedAt);
            onChanged();
          }}
        />
        <Action.Push
          title="Edit Portfolio"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<PortfolioForm portfolio={portfolio} currency={currency} onSaved={onChanged} />}
        />
        <Action.Push
          title="Create Portfolio"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          target={<PortfolioForm currency={currency} onSaved={onCreatePortfolio} />}
        />
      </ActionPanel.Section>
      {portfolio.pinnedAt ? (
        <ActionPanel.Section title="Pinned Order">
          <Action
            title="Move Earlier"
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
            onAction={async () => {
              await movePinnedPortfolio(portfolio.id, "up");
              onChanged();
            }}
          />
          <Action
            title="Move Later"
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
            onAction={async () => {
              await movePinnedPortfolio(portfolio.id, "down");
              onChanged();
            }}
          />
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section title="Reports">
        <Action
          title="Copy Portfolio Report"
          icon={Icon.Document}
          onAction={() => copyReportToClipboard([portfolio], transactions, quotes, currency)}
        />
        <Action
          title="Copy All Wallets Report"
          icon={Icon.Documents}
          onAction={() => copyReportToClipboard(portfolios, transactions, quotes, currency)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Backup">
        <Action
          title="Copy Portfolio Backup"
          icon={Icon.Download}
          onAction={() => copyBackupToClipboard([portfolio.id])}
        />
        <Action title="Copy Full Backup" icon={Icon.HardDrive} onAction={() => copyBackupToClipboard()} />
        <Action.Push title="Import Backup" icon={Icon.Upload} target={<ImportBackupForm onImported={onChanged} />} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Danger Zone">
        <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
        <Action
          title="Delete Portfolio"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Delete Portfolio?",
              message: "This removes the portfolio and all of its transactions from local storage.",
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (confirmed) {
              await deletePortfolio(portfolio.id);
              onChanged();
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function PortfolioView(props: { portfolio: Portfolio; currency: string; onChanged: () => void }) {
  const { portfolio, currency, onChanged } = props;
  const [revision, setRevision] = useState(0);
  const data = useWalletData(currency, revision);
  const activePortfolio = data.portfolios.find((candidate) => candidate.id === portfolio.id) || portfolio;
  const snapshot = calculateSnapshot(activePortfolio, data.transactions, data.quotes);
  const holdings = snapshot.positions.filter((position) => position.quantity > 0);
  const closedPositions = snapshot.positions.filter((position) => position.quantity <= 0);
  const handleChanged = () => {
    setRevision((value) => value + 1);
    onChanged();
  };

  return (
    <List
      isLoading={data.isLoading || data.isLoadingPrices}
      navigationTitle={activePortfolio.name}
      searchBarPlaceholder="Search assets"
    >
      <List.EmptyView
        title="No Assets"
        description="Add your first transaction to this portfolio."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Transaction"
              icon={Icon.Plus}
              target={<TransactionForm portfolio={activePortfolio} currency={currency} onSaved={handleChanged} />}
            />
          </ActionPanel>
        }
      />

      <List.Section title="Summary">
        <List.Item
          icon={Icon.Wallet}
          title="Current Value"
          accessories={[{ text: formatCurrency(snapshot.totalValue, currency) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Transaction"
                icon={Icon.Plus}
                target={<TransactionForm portfolio={activePortfolio} currency={currency} onSaved={handleChanged} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Circle, tintColor: snapshot.totalPnl >= 0 ? Color.Green : Color.Red }}
          title="Total P/L"
          accessories={[
            {
              text: `${formatCurrency(snapshot.totalPnl, currency)} · ${formatPercent(snapshot.totalPnlPercent)}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Portfolio Chart"
                icon={Icon.LineChart}
                target={<PortfolioChartDetail snapshot={snapshot} currency={currency} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Receipt}
          title="Realized / Unrealized"
          accessories={[
            {
              text: `${formatCurrency(snapshot.realizedPnl, currency)} / ${formatCurrency(snapshot.unrealizedPnl, currency)}`,
            },
          ]}
        />
      </List.Section>

      <List.Section title="Holdings">
        {holdings.length === 0 ? (
          <List.Item
            icon={Icon.PlusCircle}
            title="No Holdings Yet"
            subtitle="Add a buy or transfer-in transaction."
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Transaction"
                  icon={Icon.Plus}
                  target={<TransactionForm portfolio={activePortfolio} currency={currency} onSaved={handleChanged} />}
                />
              </ActionPanel>
            }
          />
        ) : null}
        {holdings.map((position) => (
          <AssetItem
            key={`${position.assetId || position.symbol}-${position.name}`}
            position={position}
            snapshot={snapshot}
            portfolio={activePortfolio}
            currency={currency}
            onChanged={handleChanged}
          />
        ))}
      </List.Section>
      {closedPositions.length > 0 ? (
        <List.Section title="Closed Positions">
          {closedPositions.map((position) => (
            <AssetItem
              key={`${position.assetId || position.symbol}-${position.name}`}
              position={position}
              snapshot={snapshot}
              portfolio={activePortfolio}
              currency={currency}
              onChanged={handleChanged}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function AssetItem(props: {
  position: AssetPosition;
  snapshot: PortfolioSnapshot;
  portfolio: Portfolio;
  currency: string;
  onChanged: () => void;
}) {
  const { position, portfolio, currency, onChanged } = props;

  return (
    <List.Item
      icon={assetIcon(position)}
      title={position.symbol}
      subtitle={compactText(position.name, 34)}
      accessories={[
        { text: formatCurrency(position.currentValue, currency), tooltip: "Current value" },
        {
          text: `${profitIcon(position.totalPnl)} ${formatCurrency(position.totalPnl, currency)} · ${formatPercent(
            position.totalPnlPercent,
          )}`,
          icon: { source: Icon.Circle, tintColor: (position.totalPnl || 0) >= 0 ? Color.Green : Color.Red },
          tooltip: "Total profit/loss",
        },
        { text: `${formatNumber(position.quantity, 4)} ${position.symbol}`, tooltip: "Quantity" },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Asset"
            icon={Icon.Document}
            target={<AssetDetail position={position} portfolio={portfolio} currency={currency} onChanged={onChanged} />}
          />
          <Action.Push
            title="Add Transaction"
            icon={Icon.Plus}
            target={
              <TransactionForm portfolio={portfolio} currency={currency} position={position} onSaved={onChanged} />
            }
          />
        </ActionPanel>
      }
    />
  );
}

function AssetDetail(props: {
  position: AssetPosition;
  portfolio: Portfolio;
  currency: string;
  onChanged: () => void;
}) {
  const { position, portfolio, currency, onChanged } = props;
  const [revision, setRevision] = useState(0);
  const data = useWalletData(currency, revision);
  const snapshot = calculateSnapshot(portfolio, data.transactions, data.quotes);
  const currentPosition =
    snapshot.positions.find((candidate) => {
      if (position.assetId && candidate.assetId) {
        return position.assetId === candidate.assetId;
      }

      return position.symbol === candidate.symbol;
    }) || position;
  const handleChanged = () => {
    setRevision((value) => value + 1);
    onChanged();
  };

  return (
    <List
      isLoading={data.isLoading || data.isLoadingPrices}
      navigationTitle={`${currentPosition.symbol} Details`}
      searchBarPlaceholder="Search transactions"
    >
      <List.Section title={`${currentPosition.name} (${currentPosition.symbol})`}>
        <MetricItem
          icon={Icon.Wallet}
          title="Current Value"
          value={formatCurrency(currentPosition.currentValue, currency)}
          actions={
            <AssetActions
              portfolio={portfolio}
              position={currentPosition}
              currency={currency}
              onChanged={handleChanged}
            />
          }
        />
        <MetricItem
          icon={{ source: Icon.Circle, tintColor: (currentPosition.totalPnl || 0) >= 0 ? Color.Green : Color.Red }}
          title="Total P/L"
          value={`${formatCurrency(currentPosition.totalPnl, currency)} · ${formatPercent(currentPosition.totalPnlPercent)}`}
          actions={
            <AssetActions
              portfolio={portfolio}
              position={currentPosition}
              currency={currency}
              onChanged={handleChanged}
            />
          }
        />
        <MetricItem
          icon={assetIcon(currentPosition)}
          title="Quantity / Avg Cost"
          value={`${formatNumber(currentPosition.quantity)} ${currentPosition.symbol} · ${formatCurrency(
            currentPosition.averageCost,
            currency,
          )}`}
          actions={
            <AssetActions
              portfolio={portfolio}
              position={currentPosition}
              currency={currency}
              onChanged={handleChanged}
            />
          }
        />
        <MetricItem
          icon={Icon.LineChart}
          title="24h / 7d"
          value={`${formatPercent(currentPosition.percentChange24h)} / ${formatPercent(currentPosition.percentChange7d)}`}
          actions={
            <AssetActions
              portfolio={portfolio}
              position={currentPosition}
              currency={currency}
              onChanged={handleChanged}
            />
          }
        />
      </List.Section>

      <List.Section title="Transactions">
        {currentPosition.transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            portfolio={portfolio}
            position={currentPosition}
            currency={currency}
            onChanged={handleChanged}
          />
        ))}
      </List.Section>
    </List>
  );
}

function MetricItem(props: { icon: Image.ImageLike; title: string; value: string; actions?: ReactNode }) {
  return (
    <List.Item icon={props.icon} title={props.title} accessories={[{ text: props.value }]} actions={props.actions} />
  );
}

function AssetActions(props: {
  portfolio: Portfolio;
  position: AssetPosition;
  currency: string;
  onChanged: () => void;
}) {
  const { portfolio, position, currency, onChanged } = props;

  return (
    <ActionPanel>
      <Action.Push
        title="Add Transaction"
        icon={Icon.Plus}
        target={<TransactionForm portfolio={portfolio} currency={currency} position={position} onSaved={onChanged} />}
      />
      <Action.Push
        title="Show Chart"
        icon={Icon.LineChart}
        target={<AssetChartDetail position={position} currency={currency} />}
      />
    </ActionPanel>
  );
}

function TransactionItem(props: {
  transaction: CryptoTransaction;
  portfolio: Portfolio;
  position: AssetPosition;
  currency: string;
  onChanged: () => void;
}) {
  const { transaction, portfolio, position, currency, onChanged } = props;
  const grossValue = transaction.quantity * transaction.price;

  return (
    <List.Item
      icon={transactionTypeIcon(transaction.type)}
      title={transactionTypeLabel(transaction.type)}
      subtitle={transaction.notes ? compactText(transaction.notes, 44) : formatDateTime(transaction.date)}
      accessories={[
        { text: formatDateTime(transaction.date), tooltip: "Date and time" },
        { text: `${formatNumber(transaction.quantity, 6)} ${transaction.assetSymbol}`, tooltip: "Quantity" },
        { text: formatCurrency(grossValue, currency), tooltip: "Gross value" },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Transaction"
            icon={Icon.Pencil}
            target={
              <TransactionForm
                portfolio={portfolio}
                currency={currency}
                position={position}
                transaction={transaction}
                onSaved={onChanged}
              />
            }
          />
          <Action
            title="Delete Transaction"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Delete Transaction?",
                message: "This removes the transaction from local storage.",
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (confirmed) {
                await deleteTransaction(transaction.id);
                onChanged();
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function AssetChartDetail(props: { position: AssetPosition; currency: string }) {
  const { position, currency } = props;
  const [layout, setLayout] = useState<ChartLayout>("stacked");

  return (
    <Detail
      navigationTitle={`${position.symbol} Chart`}
      markdown={assetChartMarkdown(position, currency, layout)}
      actions={<ChartLayoutActions layout={layout} onChange={setLayout} />}
    />
  );
}

function PortfolioChartDetail(props: { snapshot: PortfolioSnapshot; currency: string }) {
  const { snapshot, currency } = props;
  const [layout, setLayout] = useState<ChartLayout>("stacked");

  return (
    <Detail
      navigationTitle={`${snapshot.portfolio.name} Chart`}
      markdown={portfolioChartMarkdown(snapshot, currency, layout)}
      actions={<ChartLayoutActions layout={layout} onChange={setLayout} />}
    />
  );
}

function ChartLayoutActions(props: { layout: ChartLayout; onChange: (layout: ChartLayout) => void }) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Layout">
        <Action
          title={props.layout === "stacked" ? "Show Charts Side by Side" : "Show Charts One Per Row"}
          icon={props.layout === "stacked" ? Icon.Sidebar : Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() => props.onChange(props.layout === "stacked" ? "grid" : "stacked")}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function PortfolioForm(props: { portfolio?: Portfolio; currency: string; onSaved: () => void }) {
  const { portfolio, onSaved } = props;
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={portfolio ? "Edit Portfolio" : "Create Portfolio"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={portfolio ? "Save Portfolio" : "Create Portfolio"}
            icon={Icon.CheckCircle}
            onSubmit={async (values: PortfolioFormValues) => {
              if (!values.name.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "Name is required" });
                return;
              }

              await savePortfolio({
                id: portfolio?.id,
                name: values.name,
                description: values.description,
                emoji: values.symbol,
              });
              await showToast({
                style: Toast.Style.Success,
                title: portfolio ? "Portfolio saved" : "Portfolio created",
              });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Long-term holdings" defaultValue={portfolio?.name} />
      <Form.Dropdown id="symbol" title="Symbol" defaultValue={portfolio?.emoji || ""}>
        <Form.Dropdown.Item value="" title="No Symbol" />
        {WALLET_EMOJIS.map((emoji) => (
          <Form.Dropdown.Item key={emoji} value={emoji} title={emoji} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional notes"
        defaultValue={portfolio?.description}
      />
    </Form>
  );
}

function ImportBackupForm(props: { onImported: () => void }) {
  const { onImported } = props;
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Import Backup"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import Backup"
            icon={Icon.Upload}
            onSubmit={async (values: ImportBackupFormValues) => {
              try {
                const backup = JSON.parse(values.json);
                await importBackup(backup);
                await showToast({ style: Toast.Style.Success, title: "Backup Imported" });
                onImported();
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Import Failed",
                  message: error instanceof Error ? error.message : "Invalid JSON backup.",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Backup JSON" text="Paste a CryptoWallet backup exported from this extension." />
      <Form.TextArea id="json" title="JSON" placeholder="{ ... }" />
    </Form>
  );
}

export function TransactionForm(props: {
  portfolio: Portfolio;
  currency: string;
  position?: AssetPosition;
  transaction?: CryptoTransaction;
  onSaved: () => void;
}) {
  const { portfolio, currency, position, transaction, onSaved } = props;
  const { pop } = useNavigation();
  const defaultSymbol = transaction?.assetSymbol || position?.symbol;
  const defaultName = transaction?.assetName || position?.name;
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | undefined>(
    transaction?.assetId || position?.assetId
      ? {
          id: (transaction?.assetId || position?.assetId) as number,
          symbol: defaultSymbol || "",
          name: defaultName || "",
        }
      : undefined,
  );
  const [assetSymbol, setAssetSymbol] = useState(defaultSymbol || "");
  const [assetName, setAssetName] = useState(defaultName || "");
  const [price, setPrice] = useState(
    transaction ? String(transaction.price) : position?.currentPrice ? String(position.currentPrice) : "",
  );
  const [dateText, setDateText] = useState(defaultDate(transaction?.date));
  const [timeText, setTimeText] = useState(defaultTime(transaction?.date));

  async function selectAsset(asset: AssetSearchResult) {
    setSelectedAsset(asset);
    setAssetSymbol(asset.symbol);
    setAssetName(asset.name);

    if (!transaction) {
      const quote = await getLatestQuoteById(asset.id, currency).catch(() => undefined);
      if (quote?.price) {
        setPrice(String(quote.price));
      }
    }
  }

  return (
    <Form
      navigationTitle={transaction ? "Edit Transaction" : "Add Transaction"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={transaction ? "Save Transaction" : "Add Transaction"}
            icon={Icon.CheckCircle}
            onSubmit={async (values: TransactionFormValues) => {
              try {
                const symbol = values.assetSymbol.trim().toUpperCase();
                if (!symbol) {
                  throw new Error("Asset symbol is required.");
                }

                let assetId = selectedAsset?.id;
                let quote = assetId ? await getLatestQuoteById(assetId, currency).catch(() => undefined) : undefined;

                if (!assetId && !quote) {
                  const matches = await searchAssets(symbol);
                  const exactMatches = matches.filter((asset) => asset.symbol === symbol);
                  const normalizedName = values.assetName?.trim().toLowerCase();
                  const exactNameMatch = normalizedName
                    ? exactMatches.find((asset) => asset.name.toLowerCase() === normalizedName)
                    : undefined;
                  const exactMatch = exactNameMatch || exactMatches[0];
                  if (exactMatch) {
                    assetId = exactMatch.id;
                    quote = await getLatestQuoteById(exactMatch.id, currency).catch(() => undefined);
                  } else {
                    quote = await resolveAsset(symbol, currency).catch(() => undefined);
                  }
                }

                if (!assetId && !quote) {
                  throw new Error("Asset not found on CoinMarketCap. Use Search Asset or check the symbol.");
                }

                const resolvedName = values.assetName?.trim() || selectedAsset?.name || quote?.name;
                if (!resolvedName) {
                  throw new Error("Asset name is required.");
                }

                await saveTransaction({
                  id: transaction?.id,
                  portfolioId: portfolio.id,
                  type: values.type,
                  assetId: assetId || quote?.id,
                  assetSymbol: symbol,
                  assetName: resolvedName,
                  quantity: parsePositiveNumber(values.quantity, "Quantity"),
                  price: parseNonNegativeNumber(values.price, "Price"),
                  fee: parseNonNegativeNumber(values.fee, "Fee"),
                  currency,
                  date: combineDateAndTime(values.date, values.time),
                  notes: values.notes,
                });

                await showToast({
                  style: Toast.Style.Success,
                  title: transaction ? "Transaction saved" : "Transaction added",
                });
                onSaved();
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not save transaction",
                  message: error instanceof Error ? error.message : undefined,
                });
              }
            }}
          />
          <Action.Push
            title="Search Asset"
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            target={<AssetSearchView onSelect={selectAsset} />}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type" defaultValue={transaction?.type || "buy"}>
        <Form.Dropdown.Item value="buy" title="Buy" icon={transactionTypeIcon("buy")} />
        <Form.Dropdown.Item value="sell" title="Sell" icon={transactionTypeIcon("sell")} />
        <Form.Dropdown.Item value="transfer_in" title="Transfer In" icon={transactionTypeIcon("transfer_in")} />
        <Form.Dropdown.Item value="transfer_out" title="Transfer Out" icon={transactionTypeIcon("transfer_out")} />
      </Form.Dropdown>
      <Form.Description
        title="Asset"
        text={
          selectedAsset
            ? `${selectedAsset.name} (${selectedAsset.symbol}) · CoinMarketCap ID ${selectedAsset.id}`
            : "Use Search Asset to avoid ambiguous symbols."
        }
      />
      <Form.TextField
        id="assetSymbol"
        title="Symbol"
        placeholder="BTC"
        value={assetSymbol}
        onChange={(value) => {
          setAssetSymbol(value.toUpperCase());
          setSelectedAsset(undefined);
        }}
      />
      <Form.TextField
        id="assetName"
        title="Name"
        placeholder="Bitcoin"
        value={assetName}
        onChange={(value) => {
          setAssetName(value);
          setSelectedAsset(undefined);
        }}
      />
      <Form.TextField
        id="quantity"
        title="Quantity"
        placeholder="0.05"
        defaultValue={transaction ? String(transaction.quantity) : undefined}
      />
      <Form.TextField id="price" title={`Price (${currency})`} placeholder="65000" value={price} onChange={setPrice} />
      <Form.TextField
        id="fee"
        title={`Fee (${currency})`}
        placeholder="0"
        defaultValue={transaction ? String(transaction.fee) : "0"}
      />
      <Form.Dropdown
        id="datePreset"
        title="Quick Date"
        defaultValue="custom"
        onChange={(value) => {
          if (value === "today") {
            setDateText(quickDate(0));
          } else if (value === "yesterday") {
            setDateText(quickDate(1));
          } else if (value === "week") {
            setDateText(quickDate(7));
          } else if (value === "month") {
            setDateText(quickDate(30));
          }
        }}
      >
        <Form.Dropdown.Item value="custom" title="Custom" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="today" title="Today" icon={Icon.Clock} />
        <Form.Dropdown.Item value="yesterday" title="Yesterday" icon={Icon.ArrowClockwise} />
        <Form.Dropdown.Item value="week" title="7 Days Ago" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="month" title="30 Days Ago" icon={Icon.Calendar} />
      </Form.Dropdown>
      <Form.TextField id="date" title="Date" placeholder="YYYY-MM-DD" value={dateText} onChange={setDateText} />
      <Form.TextField id="time" title="Time" placeholder="14:30" value={timeText} onChange={setTimeText} />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Exchange, wallet, strategy..."
        defaultValue={transaction?.notes}
      />
    </Form>
  );
}

export function AssetSearchView(props: { onSelect: (asset: AssetSearchResult) => void | Promise<void> }) {
  const { onSelect } = props;
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (searchText.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const assets = await searchAssets(searchText);
        if (isMounted) {
          setResults(assets);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Asset search failed",
          message: error instanceof Error ? error.message : undefined,
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    const timeout = setTimeout(load, 250);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Asset"
      searchBarPlaceholder="Search by name, symbol, or slug"
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.EmptyView
        title={searchText.trim().length < 2 ? "Search CoinMarketCap Assets" : "No Assets Found"}
        description="Type at least two characters."
      />
      {results.map((asset) => (
        <List.Item
          key={asset.id}
          icon={Icon.Coins}
          title={`${asset.name} (${asset.symbol})`}
          accessories={[...(asset.rank ? [{ text: `#${asset.rank}` }] : []), { text: `ID ${asset.id}` }]}
          actions={
            <ActionPanel>
              <Action
                title="Use Asset"
                icon={Icon.CheckCircle}
                onAction={async () => {
                  await onSelect(asset);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
