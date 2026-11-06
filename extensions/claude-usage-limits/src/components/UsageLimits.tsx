import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { getProgressIcon, useCachedPromise, useCachedState } from "@raycast/utils";
import { Fragment, ReactNode, useEffect } from "react";
import { getReportRefreshInterval } from "../utils/usage-report";
import { applyAgentOrder, boldText, fetchBrimAgents, moveAgent } from "../utils/brim-agents";
import { calculateEstimatedUsage, formatResetTime } from "../utils/usage-limits-formatter";
import { ErrorMetadata } from "./ErrorMetadata";

const levelColor = (percent: number) => (percent >= 90 ? Color.Red : percent >= 70 ? Color.Orange : Color.Green);

export function UsageLimits() {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchBrimAgents);
  useEffect(() => {
    const id = setInterval(revalidate, getReportRefreshInterval());
    return () => clearInterval(id);
  }, [revalidate]);
  const [order, setOrder] = useCachedState<string[]>("agent-order", []);
  const agents = applyAgentOrder(data ?? [], order);
  const ids = agents.map((agent) => agent.id);

  const renderDetailMetadata = (): ReactNode => {
    if (agents.length === 0) {
      return (
        <ErrorMetadata
          error={error}
          isLoading={isLoading}
          noDataMessage="No agents connected"
          noDataSubMessage="Add an account in Brim"
        />
      );
    }
    return (
      <List.Item.Detail.Metadata>
        {agents.map((agent, index) => (
          <Fragment key={agent.id}>
            {index > 0 ? <List.Item.Detail.Metadata.Label title=" " /> : null}
            <List.Item.Detail.Metadata.Label
              title={boldText(agent.name)}
              text={agent.stale ? "May Be Stale" : (agent.plan ?? undefined)}
            />
            {agent.limits.map((limit) => {
              const percent = limit.utilization;
              const estimate =
                percent === null || limit.windowHours === null
                  ? null
                  : calculateEstimatedUsage(percent, limit.resetsAt, limit.windowHours);
              return (
                <Fragment key={limit.key}>
                  <List.Item.Detail.Metadata.Label
                    title={limit.label}
                    icon={
                      percent === null ? undefined : getProgressIcon(Math.min(percent, 100) / 100, levelColor(percent))
                    }
                    text={percent === null ? (limit.value ?? "") : `${percent.toFixed(0)}% Used`}
                  />
                  {limit.resetsAt ? (
                    <List.Item.Detail.Metadata.Label title="Resets By" text={formatResetTime(limit.resetsAt)} />
                  ) : null}
                  {estimate === null ? null : (
                    <List.Item.Detail.Metadata.Label title="On Pace For" text={`${estimate.toFixed(0)}%`} />
                  )}
                </Fragment>
              );
            })}
            <List.Item.Detail.Metadata.Separator />
          </Fragment>
        ))}
      </List.Item.Detail.Metadata>
    );
  };

  return (
    <List.Item
      id="usage-limits"
      title="Usage Limits"
      icon={Icon.Gauge}
      detail={<List.Item.Detail isLoading={isLoading} metadata={renderDetailMetadata()} />}
      actions={
        <ActionPanel>
          <Action title="Refresh Usage Limits" icon={Icon.ArrowClockwise} onAction={revalidate} />
          {agents.length > 1 ? (
            <>
              <ActionPanel.Submenu title="Move Agent up" icon={Icon.ArrowUp}>
                {agents.map((agent) => (
                  <Action key={agent.id} title={agent.name} onAction={() => setOrder(moveAgent(ids, agent.id, -1))} />
                ))}
              </ActionPanel.Submenu>
              <ActionPanel.Submenu title="Move Agent Down" icon={Icon.ArrowDown}>
                {agents.map((agent) => (
                  <Action key={agent.id} title={agent.name} onAction={() => setOrder(moveAgent(ids, agent.id, 1))} />
                ))}
              </ActionPanel.Submenu>
            </>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
