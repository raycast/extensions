import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useHttpClient } from "./hooks/use-http-client";
import { HistoryRequester } from "./api/history";
import { formatNumber } from "./utils/numbers";
import Style = Toast.Style;

export default function Command() {
  const httpClient = useHttpClient();

  const [isLoading, setIsLoading] = useState(true);

  const historyRequester = new HistoryRequester(httpClient);

  const [history, setHistory] = useState<Array<HistoryItem>>([]);

  useEffect(() => {
    historyRequester
      .list()
      .then((result) => {
        setHistory(result.records);
        setIsLoading(false);
      })
      .catch(async (err) => {
        await showToast(Style.Failure, err.message);
      });
  }, []);

  function prepareKeywords(historyItem: HistoryItem) {
    return [historyItem.ticker, historyItem.amount, historyItem.transactionHash].filter((i) => i) as Array<string>;
  }

  return (
    <List isLoading={isLoading}>
      {history.map((historyItem) => (
        <List.Item
          keywords={prepareKeywords(historyItem)}
          key={historyItem.transactionId}
          subtitle={historyItem.ticker}
          title={String(formatNumber(historyItem.amount))}
          actions={
            <ActionPanel>
              {historyItem.transactionHash && (
                <Action.CopyToClipboard content={historyItem.transactionHash} title="Copy Transaction Hash" />
              )}
            </ActionPanel>
          }
          accessories={[
            {
              tag: {
                value: new Date(historyItem.createdAt * 1000).toLocaleString(),
                color: Color.SecondaryText,
              },
              icon: Icon.Clock,
            },
            {
              tag: {
                value: historyItem.method === 1 ? "Deposit" : "Withdraw",
                color: historyItem.method === 1 ? Color.Green : Color.SecondaryText,
              },
              icon: historyItem.method === 1 ? Icon.ArrowDown : Icon.ArrowUp,
            },
          ]}
        />
      ))}
    </List>
  );
}
