import { ActionPanel, Action, List, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { executeAction } from "./utils/api-wrapper";
import { provider } from "./utils/auth";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { LimitOrder, TokenInfo } from "./type";
import { USDC, WRAPPED_SOL_ADDRESS } from "./constants/tokenAddress";

function formatAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

const LimitOrderDetailMetadata = ({ order }: { order: LimitOrder }) => {
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

  const isSelling = order.outputMint === WRAPPED_SOL_ADDRESS || order.outputMint === USDC.address;

  const orderExecuteText = useMemo(() => {
    if (isSelling) {
      return `${(parseFloat(order.takingAmount) / parseFloat(order.makingAmount)).toFixed(8)} ${outputMintSymbol} per ${inputMintSymbol}`;
    } else {
      return `${(parseFloat(order.makingAmount) / parseFloat(order.takingAmount)).toFixed(8)} ${inputMintSymbol} per ${outputMintSymbol}`;
    }
  }, [order.takingAmount, order.makingAmount, inputMintSymbol, outputMintSymbol]);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Total Deposited" text={`${order.makingAmount} ${inputMintSymbol}`} />
      <List.Item.Detail.Metadata.Label
        title="Total Filled"
        text={`${parseFloat(order.makingAmount) - parseFloat(order.remainingMakingAmount)}/${order.makingAmount} ${inputMintSymbol}`}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Order will execute at price" text={orderExecuteText} />
      <List.Item.Detail.Metadata.Label
        title={isSelling ? "You are selling" : "You are buying"}
        text={!isSelling ? outputMintSymbol : inputMintSymbol}
      />
      <List.Item.Detail.Metadata.Separator />
    </List.Item.Detail.Metadata>
  );
};

const ShowLimitOrders = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [orderTitles, setOrderTitles] = useState<{ [key: string]: string } | undefined>(undefined);

  useEffect(() => {
    loadLimitOrders();
  }, []);

  const loadLimitOrders = async () => {
    try {
      setIsLoading(true);
      const result = await executeAction<LimitOrder[]>("getLOs");
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
        message: "Failed to load limit orders",
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

  const cancelLimitOrder = async (orderKey: string) => {
    try {
      setIsLoading(true);
      await executeAction("cancelLO", { orderKey });
      await loadLimitOrders();
    } catch (error) {
      await showFailureToast(error, { title: "Error cancelling limit order" });
    }
  };
  return (
    <List isLoading={isLoading} isShowingDetail>
      {orders.map((order) => {
        return (
          <List.Item
            key={order.orderKey}
            title={orderTitles?.[order.orderKey] ?? formatAddress(order.inputMint)}
            // subtitle={`Total Filled: ${parseFloat(order.makingAmount) - parseFloat(order.remainingMakingAmount)}/${order.makingAmount} ${getTokenSymbol(order.outputMint)}`}
            detail={<List.Item.Detail metadata={<LimitOrderDetailMetadata order={order} />} />}
            accessories={[{ text: { value: order.status, color: Color.Green } }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="View on Solscan"
                  url={`https://solscan.io/tx/${order.openTx}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action
                  title="Cancel"
                  shortcut={{ modifiers: ["cmd"], key: "x" }}
                  onAction={() => cancelLimitOrder(order.orderKey)}
                />
                <Action title="Refresh" onAction={loadLimitOrders} shortcut={{ modifiers: ["cmd"], key: "r" }} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default withAccessToken(provider)(ShowLimitOrders);
