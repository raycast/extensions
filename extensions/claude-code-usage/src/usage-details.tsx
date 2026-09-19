import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LaunchProps,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useRef } from "react";
import { ItemActionPanel } from "./components/ItemActionPanel";
import { useClaudeUsage } from "./hooks/useClaudeUsage";
import { logout } from "./services/cache";
import { loginWithClaude } from "./services/oauth";
import { SETTINGS_URL } from "./utils/constants";
import {
  formatPercent,
  formatPlan,
  formatProgressBar,
  formatResetTime,
  formatSpend,
  formatTier,
} from "./utils/formatters";
import { getClaudeUsageIcon } from "./utils/icons";

function colorFor(percent: number): Color {
  if (percent >= 85) return Color.Red;
  if (percent >= 50) return Color.Orange;
  return Color.Green;
}

export default function Command(
  props: LaunchProps<{ launchContext?: { autoSignIn?: boolean } }>,
) {
  const { data, isLoading, hasTokens, lastError, refresh } =
    useClaudeUsage(true);
  const hasTriggeredAutoSignIn = useRef(false);

  const handleRefresh = useCallback(async () => {
    await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing usage…",
    });
    try {
      const success = await refresh();
      if (success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Usage refreshed",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not refresh usage",
        });
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not refresh usage",
      });
    }
  }, [refresh]);

  const handleSignIn = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting to Claude…",
        message: "Please complete authorization in your browser.",
      });

      const success = await loginWithClaude();
      if (success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Connected to Claude!",
        });
        await refresh();
        try {
          await launchCommand({ name: "usage", type: LaunchType.Background });
        } catch {
          // Ignore if background launch is unsupported in current context
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message,
      });
    }
  };

  useEffect(() => {
    if (
      props.launchContext?.autoSignIn &&
      hasTokens === false &&
      !hasTriggeredAutoSignIn.current
    ) {
      hasTriggeredAutoSignIn.current = true;
      void handleSignIn();
    }
  }, [props.launchContext?.autoSignIn, hasTokens]);

  const handleSignOut = async () => {
    const confirmed = await confirmAlert({
      title: "Sign Out of Claude",
      message:
        "Are you sure you want to sign out? You will need to re-authenticate to view your usage.",
      primaryAction: {
        title: "Sign Out",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!confirmed) return;

    hasTriggeredAutoSignIn.current = true;
    await logout();
    await showToast({
      style: Toast.Style.Success,
      title: "Signed Out",
    });
    await refresh();
    try {
      await launchCommand({ name: "usage", type: LaunchType.Background });
    } catch {
      // Ignore if background launch is unsupported in current context
    }
  };

  // While determining auth state on initial mount, show a clean loading list
  if (hasTokens === null) {
    return (
      <List isLoading={true} searchBarPlaceholder="Filter usage details…" />
    );
  }

  // User is not signed in
  if (hasTokens === false) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Filter usage details…">
        <List.EmptyView
          icon={Icon.Person}
          title="Connect Claude Account"
          description="Sign in with your Claude account to view your Claude Code rate limits, extra usage, and spending."
          actions={
            <ActionPanel>
              <Action
                title="Sign in with Claude…"
                icon={Icon.Person}
                onAction={handleSignIn}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // User is signed in, but data is loading for the first time
  if (!data && isLoading) {
    return (
      <List isLoading={true} searchBarPlaceholder="Filter usage details…" />
    );
  }

  // User is signed in, loading finished, but no data available
  if (!data) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Filter usage details…">
        <List.EmptyView
          icon={getClaudeUsageIcon(0)}
          title={lastError ? "Unable to Load Usage" : "No Usage Data Available"}
          description={
            lastError ??
            "Ensure your Claude account has an active subscription and network connectivity."
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={Icon.Globe}
                title="Open Usage Settings"
                url={SETTINGS_URL}
              />
              <Action
                title="Refresh Usage"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
              />
              <Action
                title="Sign Out…"
                icon={Icon.Logout}
                style={Action.Style.Destructive}
                onAction={handleSignOut}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const spend = data.spend;
  const { fiveHour, sevenDay, sevenDaySonnet } = data.rateLimits;
  const hasRateLimits = Boolean(fiveHour || sevenDay || sevenDaySonnet);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter usage details…">
      {hasRateLimits ? (
        <List.Section title="Session & Rate Limits">
          {fiveHour ? (
            <List.Item
              icon={getClaudeUsageIcon(fiveHour.utilization / 100)}
              title="Current Session (5h)"
              subtitle={formatProgressBar(fiveHour.utilization)}
              accessories={[
                ...(fiveHour.resetsAt
                  ? [{ text: formatResetTime(fiveHour.resetsAt) }]
                  : []),
                {
                  tag: {
                    value: formatPercent(fiveHour.utilization),
                    color: colorFor(fiveHour.utilization),
                  },
                },
              ]}
              actions={
                <ItemActionPanel
                  refresh={handleRefresh}
                  onSignOut={handleSignOut}
                  copyContent={`Current Session: ${formatPercent(fiveHour.utilization)}${fiveHour.resetsAt ? ` (${formatResetTime(fiveHour.resetsAt)})` : ""}`}
                />
              }
            />
          ) : null}
          {sevenDay ? (
            <List.Item
              icon={getClaudeUsageIcon(sevenDay.utilization / 100)}
              title="Weekly Limit (All Models)"
              subtitle={formatProgressBar(sevenDay.utilization)}
              accessories={[
                ...(sevenDay.resetsAt
                  ? [{ text: formatResetTime(sevenDay.resetsAt) }]
                  : []),
                {
                  tag: {
                    value: formatPercent(sevenDay.utilization),
                    color: colorFor(sevenDay.utilization),
                  },
                },
              ]}
              actions={
                <ItemActionPanel
                  refresh={handleRefresh}
                  onSignOut={handleSignOut}
                  copyContent={`Weekly Limit: ${formatPercent(sevenDay.utilization)}${sevenDay.resetsAt ? ` (${formatResetTime(sevenDay.resetsAt)})` : ""}`}
                />
              }
            />
          ) : null}
          {sevenDaySonnet ? (
            <List.Item
              icon={getClaudeUsageIcon(sevenDaySonnet.utilization / 100)}
              title="Weekly Limit (Sonnet)"
              subtitle={formatProgressBar(sevenDaySonnet.utilization)}
              accessories={[
                ...(sevenDaySonnet.resetsAt
                  ? [{ text: formatResetTime(sevenDaySonnet.resetsAt) }]
                  : []),
                {
                  tag: {
                    value: formatPercent(sevenDaySonnet.utilization),
                    color: colorFor(sevenDaySonnet.utilization),
                  },
                },
              ]}
              actions={
                <ItemActionPanel
                  refresh={handleRefresh}
                  onSignOut={handleSignOut}
                  copyContent={`Weekly Limit (Sonnet): ${formatPercent(sevenDaySonnet.utilization)}${sevenDaySonnet.resetsAt ? ` (${formatResetTime(sevenDaySonnet.resetsAt)})` : ""}`}
                />
              }
            />
          ) : null}
        </List.Section>
      ) : null}

      {spend ? (
        <List.Section title="Extra Usage">
          <List.Item
            icon={getClaudeUsageIcon(spend.percent / 100)}
            title={formatSpend(spend)}
            subtitle={formatProgressBar(spend.percent)}
            accessories={[
              ...(spend.resetsAt
                ? [{ text: formatResetTime(spend.resetsAt) }]
                : []),
              {
                tag: {
                  value: formatPercent(spend.percent),
                  color: colorFor(spend.percent),
                },
              },
            ]}
            actions={
              <ItemActionPanel
                refresh={handleRefresh}
                onSignOut={handleSignOut}
                copyContent={`Extra Usage: ${formatSpend(spend)} (${formatPercent(spend.percent)})${spend.resetsAt ? ` · ${formatResetTime(spend.resetsAt)}` : ""}`}
              />
            }
          />
        </List.Section>
      ) : !hasRateLimits ? (
        <List.Section title="Extra Usage">
          <List.Item
            icon={Icon.BankNote}
            title="Extra Usage Not Enabled"
            actions={
              <ItemActionPanel
                refresh={handleRefresh}
                onSignOut={handleSignOut}
              />
            }
          />
        </List.Section>
      ) : null}

      <List.Section title="Account Details">
        <List.Item
          icon={Icon.Person}
          title="Subscription Plan"
          accessories={[{ text: formatPlan(data.plan) }]}
          actions={
            <ItemActionPanel
              refresh={handleRefresh}
              onSignOut={handleSignOut}
            />
          }
        />
        {data.organization ? (
          <List.Item
            icon={Icon.Building}
            title="Organization"
            accessories={[{ text: data.organization }]}
            actions={
              <ItemActionPanel
                refresh={handleRefresh}
                onSignOut={handleSignOut}
              />
            }
          />
        ) : null}
        {data.rateLimitTier ? (
          <List.Item
            icon={Icon.Gauge}
            title="Rate Limit Tier"
            accessories={[{ text: formatTier(data.rateLimitTier) }]}
            actions={
              <ItemActionPanel
                refresh={handleRefresh}
                onSignOut={handleSignOut}
              />
            }
          />
        ) : null}
        {data.email ? (
          <List.Item
            icon={Icon.Envelope}
            title="Account Email"
            accessories={[{ text: data.email }]}
            actions={
              <ItemActionPanel
                refresh={handleRefresh}
                onSignOut={handleSignOut}
              />
            }
          />
        ) : null}
        <List.Item
          icon={Icon.Clock}
          title="Last Updated"
          accessories={[
            {
              text: new Date(data.fetchedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            },
          ]}
          actions={
            <ItemActionPanel
              refresh={handleRefresh}
              onSignOut={handleSignOut}
            />
          }
        />
      </List.Section>
    </List>
  );
}
