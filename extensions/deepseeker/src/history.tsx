import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useState } from "react";
import { getHistory, HistoryItem } from "./common";
import { sentToSideNote } from "./util";

function HistoryDetail({ item }: { item: HistoryItem }) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Date" text={formatDate(item.timestamp)} />
      <Detail.Metadata.Label title="Model" text={item.model} />
      <Detail.Metadata.Label title="Prompt Tokens" text={item.promptTokens.toString()} />
      <Detail.Metadata.Label title="Response Tokens" text={item.responseTokens.toString()} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Total Tokens" text={(item.promptTokens + item.responseTokens).toString()} />
      <Detail.Metadata.Label title="Cost" text={`${item.cost.toFixed(4)} cents`} />
    </Detail.Metadata>
  );

  return (
    <Detail
      markdown={item.response}
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Response" content={item.response} />
          <Action.Paste title="Paste Response" content={item.response} />
          <Action
            title="Send to SideNote"
            onAction={async () => await sentToSideNote(item.response)}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}

function HistoryListItem({
  item,
  isShowingDetail,
  setIsShowingDetail,
}: {
  item: HistoryItem;
  isShowingDetail: boolean;
  setIsShowingDetail: (showing: boolean) => void;
}) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatPrompt = (prompt: string) => {
    return prompt.length > 50 ? `${prompt.substring(0, 50)}...` : prompt;
  };

  return (
    <List.Item
      key={item.id}
      title={formatPrompt(item.prompt)}
      subtitle={item.model}
      accessories={[{ text: formatDate(item.timestamp) }]}
      actions={
        <ActionPanel>
          <Action.Push title="View Details" target={<HistoryDetail item={item} />} />
          <Action.CopyToClipboard title="Copy Response" content={item.response} />
          <Action.Paste title="Paste Response" content={item.response} />
          <Action
            title="Toggle Detail View"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => setIsShowingDetail(!isShowingDetail)}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={item.response}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Date" text={formatDate(item.timestamp)} />
              <List.Item.Detail.Metadata.Label title="Model" text={item.model} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Prompt" text={item.prompt} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Prompt Tokens" text={item.promptTokens.toString()} />
              <List.Item.Detail.Metadata.Label title="Response Tokens" text={item.responseTokens.toString()} />
              <List.Item.Detail.Metadata.Label
                title="Total Tokens"
                text={(item.promptTokens + item.responseTokens).toString()}
              />
              <List.Item.Detail.Metadata.Label title="Cost" text={`${item.cost.toFixed(4)} cents`} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

export default function History() {
  const [historyItems] = useState<HistoryItem[]>(getHistory());
  const [isShowingDetail, setIsShowingDetail] = useState(true);

  return (
    <List isShowingDetail={isShowingDetail} searchBarPlaceholder="Search history...">
      {historyItems.length === 0 ? (
        <List.EmptyView title="No history" description="Your queries will appear here" />
      ) : (
        historyItems.map((item) => (
          <HistoryListItem
            key={item.id}
            item={item}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        ))
      )}
    </List>
  );
}
