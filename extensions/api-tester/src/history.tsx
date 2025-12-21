import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
  confirmAlert,
  Alert,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { RequestHistory } from "./types";
import { getHistory, clearHistory, saveHistory } from "./storage";
import { formatTime, formatBytes, getStatusColor, formatJSON } from "./utils";

export default function History() {
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setIsLoading(true);
    const data = await getHistory();
    setHistory(data);
    setIsLoading(false);
  }

  async function handleClearHistory() {
    if (
      await confirmAlert({
        title: "Clear History",
        message: "Are you sure you want to clear all request history?",
        primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await clearHistory();
      setHistory([]);
      await showToast({ style: Toast.Style.Success, title: "History Cleared" });
    }
  }

  async function deleteHistoryItem(id: string) {
    const updated = history.filter((item) => item.id !== id);
    await saveHistory(updated);
    setHistory(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Request Removed from History",
    });
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return Color.Green;
      case "POST":
        return Color.Blue;
      case "PUT":
        return Color.Orange;
      case "DELETE":
        return Color.Red;
      case "PATCH":
        return Color.Purple;
      default:
        return Color.SecondaryText;
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search history...">
      <List.EmptyView
        title="No History"
        description="Your request history will appear here"
        icon={Icon.Clock}
      />

      {history.length > 0 && (
        <List.Section
          title={`${history.length} Request${history.length !== 1 ? "s" : ""}`}
        >
          {history.map((item) => {
            const statusColor = getStatusColor(item.response.status);
            const date = new Date(item.timestamp);

            return (
              <List.Item
                key={item.id}
                title={item.request.name}
                subtitle={item.request.url}
                icon={{
                  source: Icon.Clock,
                  tintColor: getMethodColor(item.request.method),
                }}
                accessories={[
                  {
                    tag: {
                      value: item.request.method,
                      color: getMethodColor(item.request.method),
                    },
                  },
                  { text: `${statusColor} ${item.response.status}` },
                  { text: formatTime(item.response.responseTime) },
                  { date: date, tooltip: date.toLocaleString() },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={<HistoryDetail item={item} />}
                    />
                    <Action
                      title="Replay Request"
                      icon={Icon.ArrowClockwise}
                      onAction={async () => {
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Feature Coming Soon",
                        });
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action
                      title="Remove from History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => deleteHistoryItem(item.id)}
                      shortcut={{ modifiers: ["ctrl"], key: "d" }}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Clear All History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={handleClearHistory}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function HistoryDetail({ item }: { item: RequestHistory }) {
  const [selectedTab, setSelectedTab] = useState<
    "body" | "headers" | "request"
  >("body");
  const statusColor = getStatusColor(item.response.status);
  const formattedBody = formatJSON(item.response.body);

  const getTabContent = () => {
    switch (selectedTab) {
      case "body":
        return `\`\`\`json\n${formattedBody}\n\`\`\``;
      case "headers":
        return Object.entries(item.response.headers)
          .map(([key, value]) => `- **${key}**: ${value}`)
          .join("\n");
      case "request":
        return `
### Request Details

- **Method**: ${item.request.method}
- **URL**: ${item.request.url}
- **Auth**: ${item.request.auth.type}

${
  item.request.headers.length > 0
    ? `#### Headers\n${item.request.headers.map((h) => `- **${h.key}**: ${h.value}`).join("\n")}`
    : ""
}

${
  item.request.queryParams.length > 0
    ? `#### Query Parameters\n${item.request.queryParams.map((p) => `- **${p.key}**: ${p.value}`).join("\n")}`
    : ""
}

${item.request.body.type !== "none" ? `#### Body Type\n${item.request.body.type}` : ""}
        `;
      default:
        return "";
    }
  };

  const markdown = `
# ${statusColor} ${item.response.status} ${item.response.statusText}

**${item.request.method}** \`${item.request.url}\`

---

## Response Info

- ⏱️ **Time**: ${formatTime(item.response.responseTime)}
- 📦 **Size**: ${formatBytes(item.response.size)}
- 🕐 **Timestamp**: ${new Date(item.timestamp).toLocaleString()}

---

## ${selectedTab === "body" ? "Response Body" : selectedTab === "headers" ? "Response Headers" : "Request Details"}

${getTabContent()}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {selectedTab !== "body" && (
            <Action
              title="Show Response Body"
              onAction={() => setSelectedTab("body")}
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
            />
          )}
          {selectedTab !== "headers" && (
            <Action
              title="Show Response Headers"
              onAction={() => setSelectedTab("headers")}
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
          )}
          {selectedTab !== "request" && (
            <Action
              title="Show Request Details"
              onAction={() => setSelectedTab("request")}
              icon={Icon.ArrowUp}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
            />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={`${statusColor} ${item.response.status} ${item.response.statusText}`}
          />
          <Detail.Metadata.Label
            title="Time"
            text={formatTime(item.response.responseTime)}
          />
          <Detail.Metadata.Label
            title="Size"
            text={formatBytes(item.response.size)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Method" text={item.request.method} />
          <Detail.Metadata.Label title="URL" text={item.request.url} />
          <Detail.Metadata.Label
            title="Timestamp"
            text={new Date(item.timestamp).toLocaleString()}
          />
        </Detail.Metadata>
      }
    />
  );
}
