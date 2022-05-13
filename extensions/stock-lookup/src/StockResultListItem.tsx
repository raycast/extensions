import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { SearchResult } from "./alphavantageApi";
import { changeApiKeyAlert } from "./changeApiKeyAlert";
import { StockInfo } from "./StockInfo";

interface StockResultListItemProps {
  stockResult: SearchResult;
  onChangeApiKey: () => void;
}

export const StockResultListItem = ({ stockResult, onChangeApiKey }: StockResultListItemProps) => {
  return (
    <List.Item
      key={stockResult.symbol}
      title={stockResult.symbol}
      subtitle={stockResult.name}
      accessories={[
        { text: stockResult.currency, icon: "💲", tooltip: "Currency the stock is traded in" },
        { text: stockResult.region, icon: Icon.Globe, tooltip: "Region where the stock is traded" },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title={`View ${stockResult.symbol}`}
            target={<StockInfo stockSearchResult={stockResult} />}
            icon={Icon.Document}
          />
          <Action
            title="Change API Key"
            onAction={async () => {
              changeApiKeyAlert(onChangeApiKey);
            }}
          />
        </ActionPanel>
      }
    />
  );
};
