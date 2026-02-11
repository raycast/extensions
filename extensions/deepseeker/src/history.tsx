import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useState } from "react";
import { getHistory, HistoryItem } from "./common";
import { sendToSideNote } from "./util";

function HistoryDetail({ item }: { item: HistoryItem }) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Combine all prompt information for display
  let promptDetails = "";

  // Add system prompt if it exists
  if (item.prompt && item.prompt.trim()) {
    promptDetails += "## System Prompt\n\n" + item.prompt + "\n\n";
  }

  // Add user input if it exists
  if (item.user_input && item.user_input.trim()) {
    promptDetails += "## User Input\n\n" + item.user_input + "\n\n";
  }

  // Add selected text if it exists
  if (item.selected_text && item.selected_text.trim()) {
    promptDetails += "## Selected Text\n\n" + item.selected_text + "\n\n";
  }

  // Always add the response
  promptDetails += "## Response\n\n" + item.response;

  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Date" text={formatDate(item.timestamp)} />
      <Detail.Metadata.Label title="Model" text={item.model} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Prompt Tokens" text={item.promptTokens.toString()} />
      <Detail.Metadata.Label title="Response Tokens" text={item.responseTokens.toString()} />
      <Detail.Metadata.Label title="Total Tokens" text={(item.promptTokens + item.responseTokens).toString()} />
      <Detail.Metadata.Label title="Cost" text={`${item.cost.toFixed(4)} cents`} />
    </Detail.Metadata>
  );

  return (
    <Detail
      markdown={promptDetails}
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Response" content={item.response} />
          <Action.CopyToClipboard title="Copy Complete Session" content={promptDetails} />
          <Action.Paste title="Paste Response" content={item.response} />
          <Action
            title="Send to SideNote"
            onAction={async () => await sendToSideNote(item.response)}
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

  // Generate a title based on available data
  const getTitle = () => {
    // Use user input as title if available
    if (item.user_input && item.user_input.trim()) {
      return item.user_input.length > 50 ? item.user_input.substring(0, 50) + "..." : item.user_input;
    }

    // Otherwise use first line of response
    if (item.response) {
      const firstLine = item.response.split("\n")[0].trim();
      if (firstLine) {
        // Remove markdown headers if present
        const cleanTitle = firstLine.replace(/^#+\s+/, "");
        return cleanTitle.length > 50 ? cleanTitle.substring(0, 50) + "..." : cleanTitle;
      }
      return item.response.length > 50 ? item.response.substring(0, 50) + "..." : item.response;
    }

    return "Query from " + formatDate(item.timestamp);
  };

  return (
    <List.Item
      key={item.id}
      title={getTitle()}
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

              {/* Show system prompt if available */}
              {item.prompt && item.prompt.trim() && (
                <List.Item.Detail.Metadata.Label
                  title="System Prompt"
                  text={item.prompt.length > 100 ? item.prompt.substring(0, 100) + "..." : item.prompt}
                />
              )}

              {/* Show user input if available */}
              {item.user_input && item.user_input.trim() && (
                <List.Item.Detail.Metadata.Label
                  title="User Input"
                  text={item.user_input.length > 100 ? item.user_input.substring(0, 100) + "..." : item.user_input}
                />
              )}

              {/* Show selected text if available */}
              {item.selected_text && item.selected_text.trim() && (
                <List.Item.Detail.Metadata.Label
                  title="Selected Text"
                  text={
                    item.selected_text.length > 100 ? item.selected_text.substring(0, 100) + "..." : item.selected_text
                  }
                />
              )}

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
  const [historyItems] = useState<HistoryItem[]>(() => {
    try {
      return getHistory();
    } catch (error) {
      console.error("Failed to load history:", error);
      return [];
    }
  });
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
