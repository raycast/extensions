import { List, Icon } from "@raycast/api";
import { ReactNode, useMemo } from "react";
import { formatTokens, formatCost } from "../utils/data-formatter";
import { formatDistanceToNow } from "date-fns";
import {
  calculateAverageSessionCost,
  calculateAverageSessionTokens,
  calculateEfficiencyMetrics,
} from "../utils/usage-calculator";
import { useSessionUsage } from "../hooks/useSessionUsage";
import { ErrorMetadata } from "./ErrorMetadata";
import { StandardActions } from "./common/StandardActions";
import { STANDARD_ACCESSORIES } from "./common/accessories";
import { MESSAGES } from "../utils/messages";

const MAX_SESSIONS_DISPLAY = 5;

export function SessionUsage() {
  const { recentSessions: sessions, isLoading, error } = useSessionUsage();

  const averageCost = useMemo(() => (sessions ? calculateAverageSessionCost(sessions) : 0), [sessions]);
  const averageTokens = useMemo(() => (sessions ? calculateAverageSessionTokens(sessions) : 0), [sessions]);
  const efficiency = useMemo(
    () =>
      sessions
        ? calculateEfficiencyMetrics(sessions)
        : { averageInputOutputRatio: 0, averageCostPerOutput: 0, mostEfficientModel: null },
    [sessions],
  );

  const accessories: List.Item.Accessory[] = error
    ? STANDARD_ACCESSORIES.ERROR
    : sessions.length === 0 && isLoading
      ? STANDARD_ACCESSORIES.LOADING
      : !sessions || sessions.length === 0
        ? [{ text: "No sessions", icon: Icon.Circle }]
        : [{ text: `${sessions.length} sessions`, icon: Icon.List }];
  const renderDetailMetadata = (): ReactNode => {
    const errorMetadata = ErrorMetadata({
      error,
      noDataMessage: !sessions || sessions.length === 0 ? "No recent sessions found" : undefined,
      noDataSubMessage:
        !sessions || sessions.length === 0 ? `Sessions will appear here ${MESSAGES.AFTER_USAGE}` : undefined,
    });

    if (errorMetadata) {
      return errorMetadata;
    }

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Recent Sessions"
          text={`${sessions.length} sessions`}
          icon={Icon.List}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Session Statistics" />
        <List.Item.Detail.Metadata.Label title="Average Cost per Session" text={formatCost(averageCost)} />
        <List.Item.Detail.Metadata.Label title="Average Tokens per Session" text={formatTokens(averageTokens)} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Efficiency Metrics" />
        <List.Item.Detail.Metadata.Label
          title="Avg Input/Output Ratio"
          text={`${efficiency.averageInputOutputRatio.toFixed(2)}x`}
        />
        <List.Item.Detail.Metadata.Label
          title="Cost per Output Token"
          text={`$${efficiency.averageCostPerOutput.toFixed(6)}`}
        />
        {efficiency.mostEfficientModel && (
          <List.Item.Detail.Metadata.Label title="Most Efficient Model" text={efficiency.mostEfficientModel} />
        )}
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Latest Sessions" />
        {sessions.slice(0, MAX_SESSIONS_DISPLAY).map((session, index) => (
          <List.Item.Detail.Metadata.Label
            key={session.sessionId || index}
            title={session.sessionId}
            text={`${formatTokens(session.totalTokens)} • ${formatCost(session.totalCost)} • ${formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}`}
          />
        ))}
      </List.Item.Detail.Metadata>
    );
  };

  return (
    <List.Item
      id="sessions"
      title="Sessions"
      icon={Icon.List}
      accessories={accessories}
      detail={<List.Item.Detail isLoading={isLoading} metadata={renderDetailMetadata()} />}
      actions={<StandardActions />}
    />
  );
}
