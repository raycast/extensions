import { Icon, Color, List, ActionPanel, Action } from "@raycast/api";
import useVercel from "../../hooks/use-vercel-info";
import { AIGatewayLogItem, Team } from "../../types";
import SearchBarAccessory from "../search-projects/team-switch-search-accessory";
import { fetchAIGatewayLogs, fetchAICreditsBalance } from "../../vercel";
import { usePromise } from "@raycast/utils";

function StatusIcon(httpStatus: number) {
  if (httpStatus >= 200 && httpStatus < 300) {
    return { source: Icon.Dot, tintColor: Color.Green };
  } else if (httpStatus >= 400) {
    return { source: Icon.Dot, tintColor: Color.Red };
  }
  return { source: Icon.Dot, tintColor: Color.Yellow };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0";
  if (cost < 0.0001) return `$${cost.toExponential(2)}`;
  return `$${cost.toFixed(4)}`;
}

function formatDuration(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms}ms`;
}

function formatTimestamp(timestamp: string): string {
  // Parse UTC timestamp and convert to local time
  const date = new Date(timestamp.replace(" ", "T") + "Z");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${month} ${day} ${hours}:${minutes}:${seconds}`;
}

function formatFullTimestamp(timestamp: string): string {
  const date = new Date(timestamp.replace(" ", "T") + "Z");
  return date.toLocaleString();
}

function LogDetail({ log }: { log: AIGatewayLogItem }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Time" text={formatFullTimestamp(log.timestamp)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Model" text={log.aiModel} />
          <List.Item.Detail.Metadata.Label title="Provider" text={capitalizeFirst(log.aiProvider)} />
          <List.Item.Detail.Metadata.Label title="Model Type" text={log.aiModelType} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Cost" text={formatCost(log.cost)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Input Tokens" text={String(log.inputTokens)} />
          <List.Item.Detail.Metadata.Label title="Output Tokens" text={String(log.outputTokens)} />
          <List.Item.Detail.Metadata.Label title="Cached Input Tokens" text={String(log.cachedInputTokens)} />
          <List.Item.Detail.Metadata.Label title="Cache Creation Tokens" text={String(log.cacheCreationInputTokens)} />
          <List.Item.Detail.Metadata.Label title="Reasoning Tokens" text={String(log.reasoningTokens)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Duration" text={formatDuration(log.aiRequestDurationMs)} />
          <List.Item.Detail.Metadata.Label title="Tokens/Second" text={String(log.tokensPerSecond)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

const AIGatewayLogsList = () => {
  const { user, teams, selectedTeam } = useVercel();

  const {
    isLoading,
    data: logs,
    revalidate,
  } = usePromise(
    async (teamId: string | undefined) => {
      if (!teamId) return [];
      return await fetchAIGatewayLogs(teamId);
    },
    [selectedTeam],
  );

  const { data: credits } = usePromise(
    async (teamId: string | undefined) => {
      if (!teamId) return null;
      return await fetchAICreditsBalance(teamId);
    },
    [selectedTeam],
  );

  const onTeamChange = () => {
    revalidate();
  };

  const getVercelAIGatewayUrl = () => {
    const teamSlug = teams?.find((team: Team) => team.id === selectedTeam)?.slug;
    const ownerSlug = teamSlug || user?.username;
    return `https://vercel.com/${ownerSlug}/~/ai-gateway`;
  };

  const navigationTitle = credits
    ? `AI Gateway Logs · $${parseFloat(credits.cumulativeBalance).toFixed(2)} credits`
    : "AI Gateway Logs";

  return (
    <List
      throttle
      searchBarPlaceholder="Search AI Gateway Logs..."
      navigationTitle={navigationTitle}
      isLoading={isLoading || !user}
      isShowingDetail
      searchBarAccessory={<>{user && <SearchBarAccessory onTeamChange={onTeamChange} />}</>}
    >
      <List.EmptyView
        icon={Icon.Clock}
        title="No AI Gateway Logs"
        description="No inference requests found in the past 12 hours"
      />
      {logs?.map((log, index) => (
        <List.Item
          key={`${log.timestamp}-${index}`}
          title={formatTimestamp(log.timestamp)}
          subtitle={`${log.aiModel} · ${capitalizeFirst(log.aiProvider)}`}
          icon={StatusIcon(log.httpStatus)}
          keywords={[log.aiModel, log.aiProvider, log.aiGatewayModelId]}
          detail={<LogDetail log={log} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Visit on Vercel"
                url={getVercelAIGatewayUrl()}
                icon={Icon.Globe}
                shortcut={{
                  macOS: { modifiers: ["cmd", "opt"], key: "v" },
                  Windows: { modifiers: ["ctrl", "opt"], key: "v" },
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default AIGatewayLogsList;
