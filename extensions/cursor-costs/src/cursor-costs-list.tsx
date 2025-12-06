import { useState } from "react";
import { Action, ActionPanel, Icon, List, open, openExtensionPreferences } from "@raycast/api";
import { useCursorUsage } from "./hooks/useCursorUsage";
import {
  formatCents,
  getProgressIcon,
  formatTokens,
  formatTokensFull,
  calculatePercentage,
  sortModelsByCost,
  formatDateRange,
  formatUsagePercent,
  formatUsageFraction,
  formatRemainingCents,
  calculateTotalTokens,
} from "./utils/formatting";

export default function CursorCostsList() {
  const { data, error, isLoading, refresh } = useCursorUsage();
  const [showDetail, setShowDetail] = useState(false);

  if (error) {
    const isAuthError = error.message.includes("token") || error.message.includes("Authentication");
    const description = isAuthError
      ? `${error.message}\n\nTo get a new token:\n1. Open cursor.com and sign in\n2. Press F12 → Application → Cookies\n3. Copy WorkosCursorSessionToken value`
      : error.message;

    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load Cursor costs"
          description={description}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={refresh} />
              <Action
                title="Get New Token (Open Cursor Dashboard)"
                icon={Icon.Key}
                onAction={() => open("https://cursor.com/dashboard")}
              />
              <Action title="Update Token in Settings" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!data) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView icon={Icon.Clock} title="Loading Cursor costs..." />
      </List>
    );
  }

  const usage = data.usage;
  const summary = data.summary;
  const planUsage = summary?.individualUsage?.plan;
  const sortedModels = sortModelsByCost(usage.aggregations);

  // Calculate total tokens
  const totalTokensSum =
    (Number.parseInt(usage.totalInputTokens || "0", 10) || 0) +
    (Number.parseInt(usage.totalOutputTokens || "0", 10) || 0) +
    (Number.parseInt(usage.totalCacheWriteTokens || "0", 10) || 0) +
    (Number.parseInt(usage.totalCacheReadTokens || "0", 10) || 0);

  // Toggle detail action
  const toggleDetailAction = (
    <Action
      title={showDetail ? "Hide Details" : "Show Details"}
      icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
      onAction={() => setShowDetail(!showDetail)}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
    />
  );

  // Common actions for subscription items
  const subscriptionActions = (
    <ActionPanel>
      {toggleDetailAction}
      <Action
        title="Open Billing"
        icon={Icon.Globe}
        onAction={() => open("https://cursor.com/dashboard?tab=billing")}
      />
      <Action title="Refresh" icon={Icon.RotateClockwise} onAction={refresh} />
      <Action title="Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
    </ActionPanel>
  );

  // Common actions for cost items
  const costActions = (
    <ActionPanel>
      {toggleDetailAction}
      <Action
        title="Open Usage Dashboard"
        icon={Icon.Globe}
        onAction={() => open("https://cursor.com/dashboard?tab=usage")}
      />
      <Action title="Refresh" icon={Icon.RotateClockwise} onAction={refresh} />
      <Action title="Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search models..." isShowingDetail={showDetail}>
      {/* Subscription section */}
      {summary && (
        <List.Section title="Subscription">
          <List.Item
            title="Billing Period"
            icon={Icon.Calendar}
            accessories={[{ text: formatDateRange(summary.billingCycleStart, summary.billingCycleEnd) }]}
            actions={subscriptionActions}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Plan"
                      text={summary.membershipType.charAt(0).toUpperCase() + summary.membershipType.slice(1)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Start"
                      text={new Date(summary.billingCycleStart).toLocaleDateString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="End"
                      text={new Date(summary.billingCycleEnd).toLocaleDateString()}
                    />
                    {planUsage?.enabled && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Used" text={formatCents(planUsage.used, "list")} />
                        <List.Item.Detail.Metadata.Label title="Limit" text={formatCents(planUsage.limit, "list")} />
                        <List.Item.Detail.Metadata.Label
                          title="Remaining"
                          text={formatRemainingCents(planUsage.remaining)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Usage"
                          text={formatUsagePercent(planUsage.used, planUsage.limit, planUsage.breakdown?.bonus)}
                        />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
          {planUsage?.enabled && (
            <List.Item
              title="Usage Limit"
              icon={getProgressIcon(calculatePercentage(planUsage.used + planUsage.breakdown.bonus, planUsage.limit))}
              subtitle={formatUsageFraction(planUsage.used, planUsage.limit, planUsage.breakdown.bonus)}
              accessories={[
                { text: formatUsagePercent(planUsage.used, planUsage.limit, planUsage.breakdown.bonus) },
                { text: `${formatRemainingCents(planUsage.remaining)} left` },
              ]}
              actions={subscriptionActions}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Used" text={formatCents(planUsage.used, "list")} />
                      <List.Item.Detail.Metadata.Label title="Limit" text={formatCents(planUsage.limit, "list")} />
                      <List.Item.Detail.Metadata.Label
                        title="Remaining"
                        text={formatRemainingCents(planUsage.remaining)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Percentage"
                        text={formatUsagePercent(planUsage.used, planUsage.limit, planUsage.breakdown.bonus)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Included"
                        text={formatCents(planUsage.breakdown.included, "list")}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Bonus"
                        text={formatCents(planUsage.breakdown.bonus, "list")}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Total Available"
                        text={formatCents(planUsage.breakdown.total, "list")}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          )}
        </List.Section>
      )}

      {/* Cost Summary section */}
      <List.Section title="Cost Summary">
        <List.Item
          title="Total Cost"
          icon={Icon.BankNote}
          subtitle={formatCents(usage.totalCostCents, "list")}
          accessories={[{ text: `${formatTokens(totalTokensSum)} tokens` }]}
          actions={costActions}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Total Cost"
                    text={formatCents(usage.totalCostCents, "list")}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Cache Read"
                    text={formatTokensFull(usage.totalCacheReadTokens)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Cache Write"
                    text={formatTokensFull(usage.totalCacheWriteTokens)}
                  />
                  <List.Item.Detail.Metadata.Label title="Input" text={formatTokensFull(usage.totalInputTokens)} />
                  <List.Item.Detail.Metadata.Label title="Output" text={formatTokensFull(usage.totalOutputTokens)} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Total Tokens" text={formatTokensFull(totalTokensSum)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
        {planUsage?.enabled && planUsage.breakdown.bonus > 0 && (
          <List.Item
            title="Bonus"
            icon={Icon.Gift}
            subtitle={formatCents(planUsage.breakdown.bonus, "list")}
            accessories={[{ text: "Added to limit" }]}
            actions={costActions}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Bonus"
                      text={formatCents(planUsage.breakdown.bonus, "list")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Included"
                      text={formatCents(planUsage.breakdown.included, "list")}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Total Available"
                      text={formatCents(planUsage.breakdown.total, "list")}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        )}
        {planUsage?.enabled && (usage.totalCostCents ?? 0) - planUsage.breakdown.total > 0 && (
          <List.Item
            title="Free Usage"
            icon={Icon.Stars}
            subtitle={formatCents((usage.totalCostCents ?? 0) - planUsage.breakdown.total, "list")}
            accessories={[{ text: "Free models" }]}
            actions={costActions}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Free Usage"
                      text={formatCents((usage.totalCostCents ?? 0) - planUsage.breakdown.total, "list")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Total Cost (with free)"
                      text={formatCents(usage.totalCostCents, "list")}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Plan Total"
                      text={formatCents(planUsage.breakdown.total, "list")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Description"
                      text="Usage of free models tracked by Cursor"
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        )}
      </List.Section>

      {/* Models section */}
      <List.Section title={`Models (${sortedModels.length})`}>
        {sortedModels.map((model) => {
          const percentage = calculatePercentage(model.totalCents, usage.totalCostCents);
          const totalTokens = calculateTotalTokens(model);

          return (
            <List.Item
              key={model.modelIntent}
              title={model.modelIntent}
              icon={getProgressIcon(percentage)}
              subtitle={formatCents(model.totalCents, "list")}
              accessories={[{ text: `${percentage.toFixed(1)}%` }, { text: formatTokens(totalTokens) }]}
              actions={
                <ActionPanel>
                  {toggleDetailAction}
                  <Action.CopyToClipboard
                    title="Copy Model Name"
                    content={model.modelIntent}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Cost"
                    content={formatCents(model.totalCents, "list")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Open Usage Dashboard"
                    icon={Icon.Globe}
                    onAction={() => open("https://cursor.com/dashboard?tab=usage")}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    onAction={refresh}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Model" text={model.modelIntent} />
                      <List.Item.Detail.Metadata.Label title="Cost" text={formatCents(model.totalCents, "list")} />
                      <List.Item.Detail.Metadata.Label title="Share" text={`${percentage.toFixed(2)}%`} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Cache Read"
                        text={formatTokensFull(model.cacheReadTokens)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Cache Write"
                        text={formatTokensFull(model.cacheWriteTokens)}
                      />
                      <List.Item.Detail.Metadata.Label title="Input" text={formatTokensFull(model.inputTokens)} />
                      <List.Item.Detail.Metadata.Label title="Output" text={formatTokensFull(model.outputTokens)} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Total Tokens" text={formatTokensFull(totalTokens)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
