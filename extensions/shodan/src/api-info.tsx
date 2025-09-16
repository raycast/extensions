import { Detail, ActionPanel, Action, Icon, Color, showToast, Toast, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { ShodanAPI, ShodanAPIInfo } from "./shodan-api";
import {
  getUsageInfo,
  generateErrorMarkdown,
  generateLoadingMarkdown,
  generateNoDataMarkdown,
} from "./api-info-markdown";

export default function APIInfo() {
  const [apiInfo, setApiInfo] = useState<ShodanAPIInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shodanAPI = new ShodanAPI();

  const loadAPIInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const info = await shodanAPI.getAPIInfo();
      setApiInfo(info);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load API info",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAPIInfo();
  }, []);

  const formatCredits = (credits: number) => {
    if (credits === -1) return "Unlimited";
    return credits.toLocaleString();
  };

  if (error) {
    return (
      <Detail
        markdown={generateErrorMarkdown(error)}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadAPIInfo} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return <Detail markdown={generateLoadingMarkdown()} />;
  }

  if (!apiInfo) {
    return (
      <Detail
        markdown={generateNoDataMarkdown()}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadAPIInfo} />
          </ActionPanel>
        }
      />
    );
  }

  const usage = getUsageInfo(apiInfo);

  return (
    <List
      searchBarPlaceholder="Search API usage..."
      actions={
        <ActionPanel>
          <Action title="Refresh Data" icon={Icon.ArrowClockwise} onAction={loadAPIInfo} />
          <Action.CopyToClipboard title="Copy Query Credits" content={apiInfo.query_credits.toString()} />
          <Action.CopyToClipboard title="Copy Scan Credits" content={apiInfo.scan_credits.toString()} />
          <Action.CopyToClipboard title="Copy Monitored Ips" content={apiInfo.monitored_ips.toString()} />
          <Action.CopyToClipboard
            title="Copy Account Summary"
            content={`Plan: ${apiInfo.plan}, Query Credits: ${formatCredits(apiInfo.query_credits)}, Scan Credits: ${formatCredits(apiInfo.scan_credits)}, Monitored IPs: ${apiInfo.monitored_ips}`}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Usage Statistics">
        <List.Item
          title="Query Credits"
          subtitle={`Used: ${usage.query.percentage}% • ${usage.query.used.toLocaleString()}/${usage.query.total === -1 ? "∞" : usage.query.total.toLocaleString()}`}
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          accessories={[
            {
              text: `Remaining: ${apiInfo.query_credits === -1 ? "Unlimited" : apiInfo.query_credits.toLocaleString()}`,
            },
          ]}
        />

        <List.Item
          title="Scan Credits"
          subtitle={`Used: ${usage.scan.percentage}% • ${usage.scan.used.toLocaleString()}/${usage.scan.total === -1 ? "∞" : usage.scan.total.toLocaleString()}`}
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Green }}
          accessories={[
            { text: `Remaining: ${apiInfo.scan_credits === -1 ? "Unlimited" : apiInfo.scan_credits.toLocaleString()}` },
          ]}
        />

        <List.Item
          title="Monitored IPs"
          subtitle={`Used: ${usage.monitored.percentage}% • ${usage.monitored.used.toLocaleString()}/${usage.monitored.total === -1 ? "∞" : usage.monitored.total.toLocaleString()}`}
          icon={{ source: Icon.Eye, tintColor: Color.Orange }}
          accessories={[{ text: `Active: ${apiInfo.monitored_ips.toLocaleString()}` }]}
        />
      </List.Section>
    </List>
  );
}
