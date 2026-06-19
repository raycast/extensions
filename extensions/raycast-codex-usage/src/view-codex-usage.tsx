import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { usePromise, getProgressIcon } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import { fetchCodexUsage, THREAD_LIST_LIMIT } from "./codex-usage";
import type {
  DisplayWindow,
  GetAccountRateLimitsResponse,
  RateLimitResetCredit,
  RateLimitResetCreditsResponse,
  RateLimitSnapshot,
  RateLimitWindow,
  ResetCreditsState,
  Skill,
  Thread,
} from "./codex-usage-types";

export default function Command() {
  const [resetCreditsState, setResetCreditsState] = useState<ResetCreditsState>({ data: null, isLoading: true });
  const loadGeneration = useRef(0);
  const loadUsage = useCallback(() => {
    const generation = ++loadGeneration.current;
    setResetCreditsState({ data: null, isLoading: true });

    return fetchCodexUsage((resetCredits) => {
      if (loadGeneration.current === generation) {
        setResetCreditsState({ data: resetCredits, isLoading: false });
      }
    });
  }, []);
  const { data, error, isLoading, revalidate } = usePromise(loadUsage);
  const windows = data ? getCodexWindows(data.rateLimits) : [];
  const activity = data ? getRecentActivity(data.threads) : null;
  const skills = data?.skills ?? [];
  const resetCredits = resetCreditsState.data;
  const availableResets = resetCredits ? getAvailableResets(resetCredits) : [];
  const earliestReset = availableResets[0];
  const refresh = () => {
    void revalidate();
  };

  const refreshAction = (
    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} shortcut={{ modifiers: ["cmd"], key: "r" }} />
  );

  if (error) {
    return (
      <Detail
        markdown={`# Unable to load Codex usage\n\n${error.message}\n\nMake sure Codex is installed and signed in with \`codex login\`.`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={refresh} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading && !data) {
    return (
      <List isLoading>
        <UsageSkeleton />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Rate Limits">
        {windows.map((item) => {
          const remaining = getRemainingPercent(item.window);
          return (
            <List.Item
              key={item.id}
              icon={getProgressIcon(remaining / 100, getRemainingColor(remaining))}
              title={item.label}
              subtitle={
                item.window.resetsAt
                  ? `Resets in ${formatTimeUntil(item.window.resetsAt)} · ${formatResetDate(item.window.resetsAt)}`
                  : undefined
              }
              accessories={[
                { tag: { value: `${formatPercent(remaining)}% remaining`, color: getRemainingColor(remaining) } },
              ]}
              actions={
                <ActionPanel>
                  {refreshAction}
                  <Action.OpenInBrowser
                    title="Open Codex Usage Settings"
                    url="https://chatgpt.com/codex/settings/usage"
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {resetCreditsState.isLoading ? (
        <List.Section title="Usage Resets">
          <List.Item
            icon={Icon.Replace}
            title="Rate Limit Resets"
            subtitle="Loading available resets…"
            actions={<ActionPanel>{refreshAction}</ActionPanel>}
          />
        </List.Section>
      ) : resetCredits ? (
        <List.Section title="Usage Resets">
          <List.Item
            icon={Icon.Replace}
            title="Rate Limit Resets"
            subtitle={
              earliestReset
                ? `Earliest expires ${formatCompactDateTime(earliestReset.expires_at)}`
                : "No available resets"
            }
            accessories={[
              {
                tag: {
                  value: formatResetCount(resetCredits.available_count),
                  color: Color.Blue,
                },
              },
              ...(earliestReset
                ? [
                    {
                      tag: {
                        value: formatTimeRemainingTag(earliestReset.expires_at),
                        color: getResetExpiryColor(earliestReset.expires_at),
                      },
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Resets"
                  icon={Icon.List}
                  target={<RateLimitResetsView credits={availableResets} />}
                />
                {refreshAction}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {activity ? (
        <List.Section title="Sessions">
          <List.Item
            icon={Icon.Clock}
            title="Today"
            subtitle={formatSessionCount(activity.todayCount, activity.isPartial)}
            actions={<ActionPanel>{refreshAction}</ActionPanel>}
          />
          <List.Item
            icon={Icon.Calendar}
            title="Last 7 Days"
            subtitle={formatSessionCount(activity.weekCount, activity.isPartial)}
            actions={<ActionPanel>{refreshAction}</ActionPanel>}
          />
          <List.Item
            icon={Icon.Bubble}
            title="Latest Session"
            subtitle={activity.latestTitle}
            accessories={[{ text: formatTimeAgo(activity.latestUpdatedAt) }]}
            actions={<ActionPanel>{refreshAction}</ActionPanel>}
          />
        </List.Section>
      ) : null}
      {skills.length > 0 ? (
        <List.Section title="Skills">
          <List.Item
            icon={Icon.Wand}
            title="Skills"
            accessories={[{ text: String(skills.length) }]}
            actions={
              <ActionPanel>
                <Action.Push title="View Skills" target={<SkillsDetailView skills={skills} />} />
                {refreshAction}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function UsageSkeleton() {
  return (
    <>
      <List.Section title="Rate Limits">
        <List.Item icon={getProgressIcon(0)} title="5H Limit" subtitle="Loading usage…" />
        <List.Item icon={getProgressIcon(0)} title="Weekly Limit" subtitle="Loading usage…" />
      </List.Section>
      <List.Section title="Usage Resets">
        <List.Item icon={Icon.Replace} title="Rate Limit Resets" subtitle="Loading available resets…" />
      </List.Section>
      <List.Section title="Sessions">
        <List.Item icon={Icon.Clock} title="Today" subtitle="Loading sessions…" />
        <List.Item icon={Icon.Calendar} title="Last 7 Days" subtitle="Loading sessions…" />
        <List.Item icon={Icon.Bubble} title="Latest Session" subtitle="Loading session…" />
      </List.Section>
      <List.Section title="Skills">
        <List.Item icon={Icon.Wand} title="Skills" subtitle="Loading skills…" />
      </List.Section>
    </>
  );
}

function RateLimitResetsView({ credits }: { credits: RateLimitResetCredit[] }) {
  return (
    <List navigationTitle="Rate Limit Resets" isShowingDetail={credits.length > 0}>
      {credits.length === 0 ? <List.EmptyView icon={Icon.Repeat} title="No Available Resets" /> : null}
      <List.Section title={formatResetCount(credits.length)}>
        {credits.map((credit, index) => (
          <List.Item
            key={credit.id}
            icon={Icon.Repeat}
            title={`Reset ${index + 1}`}
            accessories={[
              {
                tag: {
                  value: formatTimeRemainingTag(credit.expires_at),
                  color: getResetExpiryColor(credit.expires_at),
                },
              },
            ]}
            detail={<RateLimitResetDetail credit={credit} index={index} />}
          />
        ))}
      </List.Section>
    </List>
  );
}

function RateLimitResetDetail({ credit, index }: { credit: RateLimitResetCredit; index: number }) {
  const markdown = [
    `## Reset ${index + 1}`,
    `**${credit.title || "Rate Limit Reset"}**`,
    credit.description || "One Codex rate limit reset is available.",
    "---",
    "### Remaining",
    formatTimeRemainingTag(credit.expires_at),
    "### Granted",
    formatDateTime(credit.granted_at),
    "### Expires",
    formatDateTime(credit.expires_at),
  ].join("\n\n");

  return <List.Item.Detail markdown={markdown} />;
}

function SkillsDetailView({ skills }: { skills: Skill[] }) {
  const userSkills = skills.filter((s) => s.scope === "user");
  const systemSkills = skills.filter((s) => s.scope === "system");

  return (
    <List navigationTitle="Skills">
      {userSkills.length > 0 ? (
        <List.Section title="Your Skills">
          {userSkills.map((skill) => (
            <List.Item
              key={skill.name}
              icon={Icon.Wand}
              title={skill.interface?.displayName ?? formatSkillName(skill.name)}
              subtitle={skill.interface?.shortDescription}
            />
          ))}
        </List.Section>
      ) : null}
      {systemSkills.length > 0 ? (
        <List.Section title="Built-in">
          {systemSkills.map((skill) => (
            <List.Item
              key={skill.name}
              icon={Icon.Wand}
              title={skill.interface?.displayName ?? formatSkillName(skill.name)}
              subtitle={skill.interface?.shortDescription}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function getAvailableResets(response: RateLimitResetCreditsResponse): RateLimitResetCredit[] {
  return response.credits
    .filter((credit) => credit.status === "available")
    .sort((a, b) => Date.parse(a.expires_at) - Date.parse(b.expires_at));
}

function formatResetCount(count: number): string {
  return `${count} ${count === 1 ? "reset" : "resets"}`;
}

function formatTimeUntilDate(date: string): string {
  const millisecondsRemaining = Date.parse(date) - Date.now();

  if (millisecondsRemaining <= 0) {
    return "Expired";
  }

  const hoursRemaining = millisecondsRemaining / (60 * 60 * 1000);
  if (hoursRemaining < 24) {
    return `${Math.max(1, Math.ceil(hoursRemaining))}h`;
  }

  return `${Math.floor(hoursRemaining / 24)}d`;
}

function formatTimeRemainingTag(date: string): string {
  const remaining = formatTimeUntilDate(date);
  return remaining === "Expired" ? remaining : `${remaining} left`;
}

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatCompactDateTime(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getResetExpiryColor(date: string): Color {
  const daysRemaining = (Date.parse(date) - Date.now()) / (24 * 60 * 60 * 1000);

  if (daysRemaining < 7) {
    return Color.Red;
  }

  if (daysRemaining <= 14) {
    return Color.Yellow;
  }

  return Color.Green;
}

function getCodexWindows(response: GetAccountRateLimitsResponse): DisplayWindow[] {
  const snapshot = getCodexSnapshot(response);
  const candidates = [snapshot.primary, snapshot.secondary].flatMap((window, index) =>
    window ? [{ window, index }] : [],
  );

  if (candidates.length === 0) {
    return [];
  }

  return candidates.map(({ window, index }) => ({
    id: window.windowDurationMins === 300 ? "5h" : window.windowDurationMins === 10080 ? "weekly" : `window-${index}`,
    label: getWindowLabel(window, index),
    window,
  }));
}

function getCodexSnapshot(response: GetAccountRateLimitsResponse): RateLimitSnapshot {
  return response.rateLimitsByLimitId?.codex ?? response.rateLimits;
}

function getRecentActivity(threads: Thread[]) {
  const [latest] = threads;

  if (!latest) {
    return null;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const weekStart = Date.now() / 1000 - 7 * 24 * 60 * 60;

  return {
    latestTitle: latest.name || latest.preview || getDirectoryName(latest.cwd) || "Untitled session",
    latestUpdatedAt: latest.updatedAt,
    todayCount: threads.filter((thread) => thread.updatedAt >= todayStart).length,
    weekCount: threads.filter((thread) => thread.updatedAt >= weekStart).length,
    totalCount: threads.length,
    isPartial: threads.length === THREAD_LIST_LIMIT,
  };
}

function getWindowLabel(window: RateLimitWindow, index: number): string {
  if (window.windowDurationMins === 300) {
    return "5H Limit";
  }

  if (window.windowDurationMins === 10080) {
    return "Weekly Limit";
  }

  if (index === 0) {
    return "Primary Limit";
  }

  if (index === 1) {
    return "Secondary Limit";
  }

  if (window.windowDurationMins) {
    return `${window.windowDurationMins}m Limit`;
  }

  return `Limit ${index + 1}`;
}

function formatSessionCount(count: number, isPartial: boolean): string {
  return `${count}${isPartial ? "+" : ""} ${count === 1 && !isPartial ? "session" : "sessions"}`;
}

function getRemainingColor(remainingPercent: number): Color {
  if (remainingPercent <= 20) {
    return Color.Red;
  }

  if (remainingPercent < 50) {
    return Color.Yellow;
  }

  return Color.Green;
}

function getRemainingPercent(window: RateLimitWindow): number {
  return clampPercent(100 - window.usedPercent);
}

function formatResetDate(timestampSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(timestampSeconds * 1000));
}

function formatTimeUntil(timestampSeconds: number): string {
  const totalMinutes = Math.max(0, Math.round((timestampSeconds * 1000 - Date.now()) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatTimeAgo(timestampSeconds: number): string {
  const diffMinutes = Math.round((timestampSeconds * 1000 - Date.now()) / 60000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 60) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  const absHours = Math.abs(diffHours);

  if (absHours < 48) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(diffHours, "hour");
  }

  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(diffHours / 24), "day");
}

function getDirectoryName(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? "";
}

function formatPercent(value: number): string {
  return clampPercent(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function formatSkillName(name: string): string {
  const baseName = name.includes(":") ? (name.split(":")[1] ?? name) : name;
  return baseName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
