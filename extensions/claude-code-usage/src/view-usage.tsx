import { List, Color, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchUsageStats, getCredentials } from "./api";
import { useState, useEffect } from "react";

function getUtilizationColor(utilization: number): Color {
  if (utilization >= 80) return Color.Red;
  if (utilization >= 50) return Color.Orange;
  if (utilization >= 25) return Color.Yellow;
  return Color.Green;
}

function getUtilizationIcon(utilization: number): Icon {
  if (utilization >= 80) return Icon.ExclamationMark;
  if (utilization >= 50) return Icon.Warning;
  return Icon.CheckCircle;
}

function formatResetTime(isoString: string | null): string {
  if (!isoString) return "N/A";
  const resetDate = new Date(isoString);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();

  if (diffMs <= 0) return "Resetting now...";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  const remainingMins = diffMins % 60;

  if (diffDays > 0) return `${diffDays}d ${remainingHours}h`;
  if (diffHours > 0) return `${diffHours}h ${remainingMins}m`;
  return `${diffMins}m`;
}

function formatExactTime(isoString: string | null): string {
  if (!isoString) return "N/A";
  return new Date(isoString).toLocaleString();
}

function formatTokenExpiry(expiresAt: number): string {
  const date = new Date(expiresAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return "Expired";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d`;
  if (diffHours > 0) return `${diffHours}h`;
  return `${diffMins}m`;
}

function buildProgressBar(utilization: number, width = 20): string {
  const filled = Math.round((utilization / 100) * width);
  const empty = width - filled;
  return `${"█".repeat(filled)}${"░".repeat(empty)}`;
}

function formatTierName(tier: string): string {
  return tier
    .replace(/^default_claude_/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ViewUsage() {
  const [showDetail, setShowDetail] = useState(false);
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchUsageStats, [], {
    keepPreviousData: true,
  });
  const { data: creds } = useCachedPromise(getCredentials, [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch usage",
        message: error.message,
      });
    }
  }, [error]);

  const fiveHour = data?.five_hour;
  const sevenDay = data?.seven_day;
  const sonnet = data?.seven_day_opus;

  const subType = creds?.subscriptionType
    ? creds.subscriptionType.charAt(0).toUpperCase() + creds.subscriptionType.slice(1)
    : null;

  const actions = (
    <ActionPanel>
      <Action
        title={showDetail ? "Hide Details" : "Show Details"}
        icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
        onAction={() => setShowDetail((v) => !v)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail} searchBarPlaceholder="Claude Code Usage Stats">
      {subType && (
        <List.Section title="Account">
          <List.Item
            icon={{ source: Icon.Person, tintColor: Color.Blue }}
            title={`Claude ${subType}`}
            accessories={
              showDetail
                ? []
                : [
                    ...(creds?.rateLimitTier
                      ? [
                          {
                            tag: {
                              value: formatTierName(creds.rateLimitTier),
                              color: Color.Blue,
                            },
                          },
                        ]
                      : []),
                    {
                      text: creds ? `Token: ${formatTokenExpiry(creds.expiresAt)}` : "",
                    },
                  ]
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Plan" text={`Claude ${subType}`} />
                    {creds?.rateLimitTier && (
                      <List.Item.Detail.Metadata.TagList title="Tier">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={formatTierName(creds.rateLimitTier)}
                          color={Color.Blue}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Token Status"
                      text={creds ? formatTokenExpiry(creds.expiresAt) : "Unknown"}
                      icon={
                        creds && new Date(creds.expiresAt).getTime() > Date.now()
                          ? { source: Icon.CheckCircle, tintColor: Color.Green }
                          : { source: Icon.XMarkCircle, tintColor: Color.Red }
                      }
                    />
                    {creds && (
                      <List.Item.Detail.Metadata.Label
                        title="Expires"
                        text={new Date(creds.expiresAt).toLocaleString()}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions}
          />
        </List.Section>
      )}

      <List.Section title="Current Session">
        <List.Item
          icon={{
            source: Icon.Clock,
            tintColor: fiveHour ? getUtilizationColor(fiveHour.utilization) : Color.SecondaryText,
          }}
          title="5-Hour Window"
          subtitle={fiveHour ? buildProgressBar(fiveHour.utilization) : ""}
          accessories={
            showDetail
              ? []
              : [
                  {
                    tag: fiveHour
                      ? {
                          value: `${fiveHour.utilization.toFixed(1)}%`,
                          color: getUtilizationColor(fiveHour.utilization),
                        }
                      : { value: "...", color: Color.SecondaryText },
                  },
                  {
                    text: fiveHour ? `Resets in ${formatResetTime(fiveHour.resets_at)}` : "",
                    icon: fiveHour ? getUtilizationIcon(fiveHour.utilization) : undefined,
                  },
                ]
          }
          detail={
            <List.Item.Detail
              metadata={
                fiveHour ? (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Utilization">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${fiveHour.utilization.toFixed(1)}%`}
                        color={getUtilizationColor(fiveHour.utilization)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(fiveHour.resets_at)} />
                    <List.Item.Detail.Metadata.Label title="Reset Time" text={formatExactTime(fiveHour.resets_at)} />
                  </List.Item.Detail.Metadata>
                ) : (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Status" text="No data available" />
                  </List.Item.Detail.Metadata>
                )
              }
            />
          }
          actions={actions}
        />
      </List.Section>

      <List.Section title="Weekly Limits">
        <List.Item
          icon={{
            source: Icon.Calendar,
            tintColor: sevenDay ? getUtilizationColor(sevenDay.utilization) : Color.SecondaryText,
          }}
          title="All Models"
          subtitle={sevenDay ? buildProgressBar(sevenDay.utilization) : ""}
          accessories={
            showDetail
              ? []
              : [
                  {
                    tag: sevenDay
                      ? {
                          value: `${sevenDay.utilization.toFixed(1)}%`,
                          color: getUtilizationColor(sevenDay.utilization),
                        }
                      : { value: "...", color: Color.SecondaryText },
                  },
                  {
                    text: sevenDay ? `Resets in ${formatResetTime(sevenDay.resets_at)}` : "",
                    icon: sevenDay ? getUtilizationIcon(sevenDay.utilization) : undefined,
                  },
                ]
          }
          detail={
            <List.Item.Detail
              metadata={
                sevenDay ? (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Utilization">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${sevenDay.utilization.toFixed(1)}%`}
                        color={getUtilizationColor(sevenDay.utilization)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(sevenDay.resets_at)} />
                    <List.Item.Detail.Metadata.Label title="Reset Time" text={formatExactTime(sevenDay.resets_at)} />
                  </List.Item.Detail.Metadata>
                ) : (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Status" text="No data available" />
                  </List.Item.Detail.Metadata>
                )
              }
            />
          }
          actions={actions}
        />

        {sonnet && (
          <List.Item
            icon={{
              source: Icon.Star,
              tintColor: getUtilizationColor(sonnet.utilization),
            }}
            title="Sonnet Only"
            subtitle={buildProgressBar(sonnet.utilization)}
            accessories={
              showDetail
                ? []
                : [
                    {
                      tag: {
                        value: `${sonnet.utilization.toFixed(1)}%`,
                        color: getUtilizationColor(sonnet.utilization),
                      },
                    },
                    {
                      text: `Resets in ${formatResetTime(sonnet.resets_at)}`,
                      icon: getUtilizationIcon(sonnet.utilization),
                    },
                  ]
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Utilization">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${sonnet.utilization.toFixed(1)}%`}
                        color={getUtilizationColor(sonnet.utilization)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(sonnet.resets_at)} />
                    <List.Item.Detail.Metadata.Label title="Reset Time" text={formatExactTime(sonnet.resets_at)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions}
          />
        )}

        {data?.seven_day_oauth_apps && (
          <List.Item
            icon={{
              source: Icon.Globe,
              tintColor: getUtilizationColor(data.seven_day_oauth_apps.utilization),
            }}
            title="OAuth Apps"
            subtitle={buildProgressBar(data.seven_day_oauth_apps.utilization)}
            accessories={
              showDetail
                ? []
                : [
                    {
                      tag: {
                        value: `${data.seven_day_oauth_apps.utilization.toFixed(1)}%`,
                        color: getUtilizationColor(data.seven_day_oauth_apps.utilization),
                      },
                    },
                    {
                      text: `Resets in ${formatResetTime(data.seven_day_oauth_apps.resets_at)}`,
                      icon: getUtilizationIcon(data.seven_day_oauth_apps.utilization),
                    },
                  ]
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Utilization">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${data.seven_day_oauth_apps.utilization.toFixed(1)}%`}
                        color={getUtilizationColor(data.seven_day_oauth_apps.utilization)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Resets In"
                      text={formatResetTime(data.seven_day_oauth_apps.resets_at)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Reset Time"
                      text={formatExactTime(data.seven_day_oauth_apps.resets_at)}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions}
          />
        )}
      </List.Section>
    </List>
  );
}
