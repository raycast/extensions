import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { executeAction } from "./utils/api-wrapper";
import { provider } from "./utils/auth";
import { withAccessToken } from "@raycast/utils";
import { DCAOrder, DCAOrderTrade, TokenInfo } from "./type";

function formatAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatCycleFrequency(frequency: string): string {
  const seconds = parseInt(frequency);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minute(s)`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour(s)`;
  return `${Math.floor(seconds / 86400)} day(s)`;
}

const DCATradesMetadata = ({ trade }: { trade: DCAOrderTrade }) => {
  return (
    <List.Item.Detail.Metadata.Link
      title="Trade"
      target={`https://solscan.io/tx/${trade.txId}`}
      text={new Date(trade.confirmedAt).toLocaleString()}
    />
  );
};

const DCAOrderDetailMetadata = ({ order }: { order: DCAOrder }) => {
  const getTokenSymbol = async (mint: string) => {
    try {
      const result = await executeAction<TokenInfo>(
        "getToken",
        {
          tokenId: mint,
        },
        true,
        1000 * 60,
      );
      return result.data?.symbol;
    } catch (error) {
      console.error(error);
      return formatAddress(mint);
    }
  };

  const [inputMintSymbol, setInputMintSymbol] = useState<string | undefined>(undefined);
  const [outputMintSymbol, setOutputMintSymbol] = useState<string | undefined>(undefined);

  useEffect(() => {
    getTokenSymbol(order.inputMint).then(setInputMintSymbol);
    getTokenSymbol(order.outputMint).then(setOutputMintSymbol);
  }, [order.inputMint, order.outputMint]);

  const averagePrice = useMemo(() => {
    if (parseFloat(order.outReceived) === 0) return "N/A";
    return (parseFloat(order.inUsed) / parseFloat(order.outReceived)).toFixed(8);
  }, [order.inUsed, order.outReceived]);

  const completionPercentage = useMemo(() => {
    if (parseFloat(order.inDeposited) === 0) return 0;
    return ((parseFloat(order.inUsed) / parseFloat(order.inDeposited)) * 100).toFixed(1);
  }, [order.inUsed, order.inDeposited]);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title={`DCA ${inputMintSymbol} Balance`}
        text={`${parseFloat(order.inDeposited) - parseFloat(order.inUsed)} ${inputMintSymbol}`}
      />
      <List.Item.Detail.Metadata.Label
        title={`DCA ${outputMintSymbol} Balance`}
        text={`${parseFloat(order.outReceived) - parseFloat(order.outWithdrawn)} ${outputMintSymbol}`}
      />
      <List.Item.Detail.Metadata.Label
        title={`${outputMintSymbol} Withdrawn`}
        text={`${parseFloat(order.outWithdrawn)} ${outputMintSymbol}`}
      />
      <List.Item.Detail.Metadata.Label title="Total Deposited" text={`${order.inDeposited} ${inputMintSymbol}`} />
      <List.Item.Detail.Metadata.Label
        title="Total Spent"
        text={`${order.inUsed} ${inputMintSymbol} (${completionPercentage}%)`}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Every" text={formatCycleFrequency(order.cycleFrequency)} />
      <List.Item.Detail.Metadata.Label title="Each Order Size" text={`${order.inAmountPerCycle} ${inputMintSymbol}`} />
      <List.Item.Detail.Metadata.Label
        title="Over"
        text={`${(parseFloat(order.inDeposited) / parseFloat(order.inAmountPerCycle)).toFixed(0)} Order(s)`}
      />
      <List.Item.Detail.Metadata.Label
        title="Orders Remaining"
        text={`${(
          parseFloat(order.inDeposited) / parseFloat(order.inAmountPerCycle) -
          parseFloat(order.inUsed) / parseFloat(order.inAmountPerCycle)
        ).toFixed(0)} Order(s)`}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Average Price"
        text={`${averagePrice} ${inputMintSymbol} per ${outputMintSymbol}`}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Total Trades" text={order.trades.length.toString()} />
      <List.Item.Detail.Metadata.Link
        title="Create"
        target={`https://solscan.io/tx/${order.openTx}`}
        text={new Date(order.createdAt).toLocaleString()}
      />
      {order.trades.map((trade) => (
        <DCATradesMetadata key={trade.txId} trade={trade} />
      ))}
      <List.Item.Detail.Metadata.Separator />
    </List.Item.Detail.Metadata>
  );
};

const ShowDCAOrders = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<DCAOrder[]>([]);
  const [orderTitles, setOrderTitles] = useState<{ [key: string]: string } | undefined>(undefined);

  useEffect(() => {
    loadDCAOrders();
  }, []);

  const loadDCAOrders = async () => {
    try {
      setIsLoading(true);
      const result = await executeAction<DCAOrder[]>("getDCAOrders");
      setOrders(result.data ?? []);
      const orderTitles: { [key: string]: string } = {};
      if (result.data) {
        for (const order of result.data) {
          orderTitles[order.orderKey] =
            `${await getTokenSymbol(order.inputMint)} → ${await getTokenSymbol(order.outputMint)}`;
        }
      }
      setOrderTitles(orderTitles);
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load DCA orders",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTokenSymbol = async (mint: string) => {
    try {
      const result = await executeAction<TokenInfo>(
        "getToken",
        {
          tokenId: mint,
        },
        true,
        1000 * 60,
      );
      return result.data?.symbol;
    } catch (error) {
      console.error(error);
      return formatAddress(mint);
    }
  };

  const cancelDCAOrder = async (orderKey: string) => {
    try {
      setIsLoading(true);
      await executeAction("cancelDCA", { orderKey });
      await loadDCAOrders();
      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "DCA order cancelled successfully",
      });
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to cancel DCA order",
      });
    }
  };

  return (
    <List isLoading={isLoading} isShowingDetail>
      {orders.map((order) => {
        const completionPercentage =
          parseFloat(order.inDeposited) === 0 ? 0 : (parseFloat(order.inUsed) / parseFloat(order.inDeposited)) * 100;

        return (
          <List.Item
            key={order.orderKey}
            title={orderTitles?.[order.orderKey] ?? formatAddress(order.inputMint)}
            accessories={[
              {
                text: `${completionPercentage.toFixed(2)}% `,
              },
            ]}
            detail={<List.Item.Detail metadata={<DCAOrderDetailMetadata order={order} />} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="View on Solscan"
                  url={`https://solscan.io/tx/${order.openTx}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                {!order.userClosed && (
                  <Action
                    title="Cancel DCA"
                    onAction={() => cancelDCAOrder(order.orderKey)}
                    shortcut={{ modifiers: ["cmd"], key: "x" }}
                  />
                )}
                <Action title="Refresh" onAction={loadDCAOrders} shortcut={{ modifiers: ["cmd"], key: "r" }} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default withAccessToken(provider)(ShowDCAOrders);
