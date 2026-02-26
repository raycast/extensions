import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  Clipboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useCallback } from "react";
import { CheckResult, HistoryEntry } from "./types";
import { normalizeUrl, extractDomain, formatResponseTime } from "./utils";
import { checkWebsite } from "./check-website";
import {
  getHistory,
  addToHistory,
  removeHistoryEntry,
  clearHistory,
} from "./history";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const { data: history, revalidate: revalidateHistory } =
    usePromise(getHistory);

  const performCheck = useCallback(
    async (input: string) => {
      let url: string;
      try {
        url = normalizeUrl(input);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid URL",
          message: `"${input}" is not a valid URL`,
        });
        return;
      }

      setIsChecking(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Checking...",
        message: extractDomain(url),
      });

      try {
        const checkResult = await checkWebsite(url);
        setResult(checkResult);

        const entry: HistoryEntry = {
          ...checkResult,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          domain: extractDomain(url),
        };
        await addToHistory(entry);
        revalidateHistory();

        if (checkResult.status === "up") {
          toast.style = Toast.Style.Success;
          toast.title = "Website is UP";
          toast.message = `${checkResult.statusCode} — ${formatResponseTime(checkResult.responseTimeMs)}`;
        } else if (checkResult.status === "available") {
          toast.style = Toast.Style.Success;
          toast.title = "Domain Available";
          toast.message = "This domain appears unregistered";
        } else if (checkResult.status === "blocked") {
          toast.style = Toast.Style.Failure;
          toast.title = "Possibly Blocked";
          toast.message = "Up globally but unreachable from your network";
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Website is DOWN";
          toast.message =
            checkResult.errorMessage ??
            `${checkResult.statusCode} ${checkResult.statusText}`;
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Check Failed";
        toast.message = error instanceof Error ? error.message : String(error);
      } finally {
        setIsChecking(false);
      }
    },
    [revalidateHistory],
  );

  const hasInput = searchText.trim().length > 0;

  return (
    <List
      filtering={false}
      throttle
      searchBarPlaceholder="Enter a domain or URL (e.g. google.com)"
      onSearchTextChange={setSearchText}
      isLoading={isChecking}
    >
      {/* Check action — shown when user types something */}
      {hasInput && (
        <List.Section title="Check">
          <List.Item
            icon={{ source: Icon.Globe, tintColor: Color.Blue }}
            title={`Check ${searchText.trim()}`}
            subtitle="Press Enter to check"
            actions={
              <ActionPanel>
                <Action
                  title="Check Website"
                  icon={Icon.Globe}
                  onAction={() => performCheck(searchText.trim())}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Result — shown after a check */}
      {result && (
        <List.Section title="Result">
          <List.Item
            icon={statusIcon(result.status)}
            title={extractDomain(result.url)}
            subtitle={resultSubtitle(result)}
            accessories={[
              {
                text: formatResponseTime(result.responseTimeMs),
                icon: Icon.Clock,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Check Again"
                  icon={Icon.ArrowClockwise}
                  onAction={() => performCheck(extractDomain(result.url))}
                />
                <Action.OpenInBrowser url={result.url} />
                <Action.CopyToClipboard title="Copy URL" content={result.url} />
                <Action
                  title="Copy Result"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(formatResultText(result));
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied to clipboard",
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <List.Section title="Recent Checks">
          {history.map((entry) => (
            <List.Item
              key={entry.id}
              icon={statusIcon(entry.status)}
              title={entry.domain}
              subtitle={resultSubtitle(entry)}
              accessories={[
                {
                  text: formatResponseTime(entry.responseTimeMs),
                  icon: Icon.Clock,
                },
                {
                  date: new Date(entry.checkedAt),
                  tooltip: new Date(entry.checkedAt).toLocaleString(),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Check Again"
                    icon={Icon.ArrowClockwise}
                    onAction={() => performCheck(entry.domain)}
                  />
                  <Action.OpenInBrowser url={entry.url} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={entry.url}
                  />
                  <Action
                    title="Remove from History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      await removeHistoryEntry(entry.id);
                      revalidateHistory();
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Removed from history",
                      });
                    }}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Clear All History?",
                          message: "This will remove all recent checks.",
                          primaryAction: {
                            title: "Clear",
                            style: Alert.ActionStyle.Destructive,
                          },
                        })
                      ) {
                        await clearHistory();
                        revalidateHistory();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "History cleared",
                        });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Empty state */}
      {!hasInput && !result && (!history || history.length === 0) && (
        <List.EmptyView
          icon={Icon.Globe}
          title="Is This Website Down?"
          description="Type a domain or URL above to get started"
        />
      )}
    </List>
  );
}

function statusIcon(status: CheckResult["status"]) {
  switch (status) {
    case "up":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "available":
      return { source: Icon.Tag, tintColor: Color.Yellow };
    case "blocked":
      return { source: Icon.Shield, tintColor: Color.Orange };
    case "down":
    case "error":
    default:
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
}

function resultSubtitle(result: CheckResult): string {
  if (result.status === "up") {
    return `UP — ${result.statusCode} ${result.statusText ?? ""}`.trim();
  }
  if (result.status === "available") {
    return "AVAILABLE — domain not registered";
  }
  if (result.status === "blocked") {
    return "BLOCKED — up globally, unreachable from your network";
  }
  if (result.errorMessage) {
    return `DOWN — ${result.errorMessage}`;
  }
  return `DOWN — ${result.statusCode} ${result.statusText ?? ""}`.trim();
}

function formatResultText(result: CheckResult): string {
  const domain = extractDomain(result.url);
  if (result.status === "up") {
    return `${domain} is UP (${result.statusCode} ${result.statusText} — ${formatResponseTime(result.responseTimeMs)})`;
  }
  if (result.status === "available") {
    return `${domain} is AVAILABLE — domain appears unregistered`;
  }
  if (result.status === "blocked") {
    return `${domain} is BLOCKED — up globally but unreachable from your network`;
  }
  const reason =
    result.errorMessage ?? `${result.statusCode} ${result.statusText}`;
  return `${domain} is DOWN (${reason} — ${formatResponseTime(result.responseTimeMs)})`;
}
