import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ClaudeApiError, fetchUsage } from "./lib/client";
import { computeBurnRate, recordSample } from "./lib/history";
import {
  bar,
  countdown,
  localTime,
  pct,
  severityColor,
  severityIcon,
} from "./lib/format";
import type { BurnRate, ClaudeUsage, UsageWindow } from "./lib/types";

export default function Dashboard() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      const usage = await fetchUsage();
      recordSample(usage);
      return usage;
    },
    [],
    { keepPreviousData: true },
  );

  if (error && !data) {
    const auth = error instanceof ClaudeApiError && error.isAuthError;
    return (
      <List>
        <List.EmptyView
          icon={auth ? Icon.Key : Icon.Warning}
          title={auth ? "Claude Code login required" : "Could not load usage"}
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.OpenInBrowser
                title="Open Usage Settings"
                url="https://claude.ai/settings/usage"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const rate = data ? computeBurnRate(data) : null;

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle="Claude Usage">
      {data && (
        <>
          <List.Section title="Limits">
            <WindowRow
              title="Current Session"
              subtitle="5-hour window"
              w={data.fiveHour}
              usage={data}
              rate={rate}
              kind="session"
              revalidate={revalidate}
            />
            <WindowRow
              title="Weekly — All Models"
              subtitle="7-day window"
              w={data.sevenDay}
              usage={data}
              rate={rate}
              kind="weekly"
              revalidate={revalidate}
            />
            {data.sevenDayOpus && (
              <WindowRow
                title="Weekly — Opus"
                subtitle="model sub-limit"
                w={data.sevenDayOpus}
                usage={data}
                rate={rate}
                kind="opus"
                revalidate={revalidate}
              />
            )}
            {data.sevenDaySonnet && (
              <WindowRow
                title="Weekly — Sonnet"
                subtitle="model sub-limit"
                w={data.sevenDaySonnet}
                usage={data}
                rate={rate}
                kind="sonnet"
                revalidate={revalidate}
              />
            )}
          </List.Section>

          {data.extraUsage?.isEnabled && (
            <List.Section title="Extra Usage">
              <ExtraUsageRow usage={data} revalidate={revalidate} />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

type Kind = "session" | "weekly" | "opus" | "sonnet";

function WindowRow(props: {
  title: string;
  subtitle: string;
  w: UsageWindow | null;
  usage: ClaudeUsage;
  rate: BurnRate | null;
  kind: Kind;
  revalidate: () => void;
}) {
  const { title, subtitle, w, usage, rate, kind, revalidate } = props;
  const utilization = w?.utilization ?? 0;
  const color = w ? severityColor(utilization) : Color.SecondaryText;

  return (
    <List.Item
      icon={{
        source: w ? severityIcon(utilization) : Icon.Circle,
        tintColor: color,
      }}
      title={title}
      accessories={[{ tag: { value: w ? pct(utilization) : "—", color } }]}
      detail={
        <WindowDetail
          title={title}
          subtitle={subtitle}
          w={w}
          usage={usage}
          rate={rate}
          kind={kind}
        />
      }
      actions={<CommonActions revalidate={revalidate} />}
    />
  );
}

function WindowDetail(props: {
  title: string;
  subtitle: string;
  w: UsageWindow | null;
  usage: ClaudeUsage;
  rate: BurnRate | null;
  kind: Kind;
}) {
  const { title, subtitle, w, usage, rate, kind } = props;

  const md = w
    ? [
        `## ${title}`,
        ``,
        `\`${bar(w.utilization, 28)}\``,
        ``,
        `# ${pct(w.utilization)} used · ${pct(100 - w.utilization)} left`,
      ].join("\n")
    : `## ${title}\n\nNo active window. Your next prompt starts a new one.`;

  const cd = countdown(w?.resetsAt);
  const at = localTime(w?.resetsAt);
  const fetched = new Date(usage.fetchedAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <List.Item.Detail
      markdown={md}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Window" text={subtitle} />
          {w && (
            <List.Item.Detail.Metadata.TagList title="Status">
              <List.Item.Detail.Metadata.TagList.Item
                text={statusLabel(w.utilization)}
                color={severityColor(w.utilization)}
              />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Resets in"
            text={cd ?? "—"}
            icon={Icon.Hourglass}
          />
          <List.Item.Detail.Metadata.Label
            title="Reset time"
            text={at ?? "—"}
            icon={Icon.Clock}
          />
          {kind === "session" && rate && rate.sessionPerHour !== null && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Burn rate"
                text={`${rate.sessionPerHour.toFixed(1)} %/h (last ${rate.windowMinutes} min)`}
                icon={Icon.Bolt}
              />
              {rate.sessionExhaustedAt ? (
                <List.Item.Detail.Metadata.Label
                  title="Limit reached at this pace"
                  text={`in ~${countdown(new Date(rate.sessionExhaustedAt).toISOString()) ?? "—"}`}
                  icon={Icon.ExclamationMark}
                />
              ) : (
                rate.projectedSessionAtReset !== null && (
                  <List.Item.Detail.Metadata.Label
                    title="Projected at reset"
                    text={`~${pct(rate.projectedSessionAtReset)}`}
                    icon={Icon.LineChart}
                  />
                )
              )}
            </>
          )}
          {kind === "weekly" && rate && rate.weeklyPerHour !== null && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Weekly burn rate"
                text={`${rate.weeklyPerHour.toFixed(2)} %/h`}
                icon={Icon.Bolt}
              />
              {rate.weeklyPerHour > 0 && w && (
                <List.Item.Detail.Metadata.Label
                  title="Daily pace"
                  text={`~${(rate.weeklyPerHour * 24).toFixed(1)} %/day — budget is ~14.3 %/day`}
                  icon={Icon.Calendar}
                />
              )}
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Account"
            text={usage.orgName}
            icon={Icon.Person}
          />
          <List.Item.Detail.Metadata.Label
            title="Last fetched"
            text={fetched}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function ExtraUsageRow({
  usage,
  revalidate,
}: {
  usage: ClaudeUsage;
  revalidate: () => void;
}) {
  const extra = usage.extraUsage;
  if (!extra) return null;
  const used =
    extra.usedCredits != null ? `$${extra.usedCredits.toFixed(2)}` : "—";
  const limit =
    extra.monthlyLimit != null ? `$${extra.monthlyLimit.toFixed(2)}` : "no cap";
  const utilization = extra.utilization ?? 0;
  return (
    <List.Item
      icon={{ source: Icon.Coins, tintColor: severityColor(utilization) }}
      title="Extra Usage Credits"
      accessories={[
        { tag: { value: extra.utilization != null ? pct(utilization) : used } },
      ]}
      detail={
        <List.Item.Detail
          markdown={`## Extra Usage\n\n\`${bar(utilization, 28)}\`\n\n# ${used} of ${limit}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Used this month"
                text={used}
              />
              <List.Item.Detail.Metadata.Label
                title="Monthly limit"
                text={limit}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<CommonActions revalidate={revalidate} />}
    />
  );
}

function CommonActions({ revalidate }: { revalidate: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={async () => {
          await fetchUsage({ force: true });
          revalidate();
        }}
      />
      <Action.OpenInBrowser
        title="Open Usage Settings"
        url="https://claude.ai/settings/usage"
      />
      <Action
        title="Open Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );
}

function statusLabel(utilization: number): string {
  if (utilization >= 90) return "Critical";
  if (utilization >= 75) return "High";
  if (utilization >= 50) return "Moderate";
  return "Plenty left";
}
