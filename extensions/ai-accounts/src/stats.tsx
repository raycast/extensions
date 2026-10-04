import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  aggregateModels,
  compactNumber,
  lifetimeSummary,
  money,
  readStatsSnapshot,
  refreshStats,
  type ProviderStats,
  type UsageTokens,
} from "./lib/stats";
import { getConfig, stateDir } from "./raycast/runtime";

const PROVIDER_NAMES = { claude: "Claude Code", codex: "Codex" };
const PRICE_NOTE = "Claude costs are list-price estimates. Subscription plans do not pay this amount.";
const CODEX_NOTE =
  "Codex totals come from the saved session index. Each session excludes inherited usage. Saved counts remain after log cleanup. Last 30 days counts use session start dates.";
const MODEL_NOTE = "Claude models only. Codex usage has no per-model totals.";

function dateLabel(value: string | null): string {
  return value ? value.slice(0, 10) : "Unavailable";
}

function markdownText(value: string): string {
  return value.replace(/[\\`*_{}[\]<>#|]/g, "\\$&").replace(/[\r\n]+/g, " ");
}

const CLAUDE_NOTE = "Claude Code logs do not record account identity, so usage combines all accounts.";

function tokenMetadata(tokens: UsageTokens) {
  return (
    <>
      <List.Item.Detail.Metadata.Label title="Total tokens" text={compactNumber(tokens.total)} />
      <List.Item.Detail.Metadata.Label title="Input" text={compactNumber(tokens.input)} />
      <List.Item.Detail.Metadata.Label title="Output" text={compactNumber(tokens.output)} />
      <List.Item.Detail.Metadata.Label title="Cache read" text={compactNumber(tokens.cachedInput)} />
      {tokens.cacheWrite !== undefined ? (
        <List.Item.Detail.Metadata.Label title="Cache write" text={compactNumber(tokens.cacheWrite)} />
      ) : null}
      {tokens.reasoning !== undefined ? (
        <List.Item.Detail.Metadata.Label title="Reasoning" text={compactNumber(tokens.reasoning)} />
      ) : null}
    </>
  );
}

export default function UsageStatistics() {
  const [snapshot, setSnapshot] = useState(() => readStatsSnapshot(stateDir()));
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const mounted = useRef(false);
  const refreshing = useRef(false);
  const rescanQueued = useRef(false);

  const refresh = useCallback(async (rescan = false) => {
    if (refreshing.current) {
      if (rescan && mounted.current) rescanQueued.current = true;
      return;
    }
    refreshing.current = true;
    if (mounted.current) {
      setIsLoading(true);
      setRefreshFailed(false);
    }
    try {
      const next = await refreshStats({
        stateDir: stateDir(),
        codexbarPath: getConfig().codexbarPath,
        rescan,
        onUpdate: (update) => {
          if (mounted.current) setSnapshot(update);
        },
      });
      if (mounted.current) setSnapshot(next);
    } catch {
      if (mounted.current) setRefreshFailed(true);
    } finally {
      refreshing.current = false;
      if (mounted.current && rescanQueued.current) {
        rescanQueued.current = false;
        void refresh(true);
      } else {
        rescanQueued.current = false;
        if (mounted.current) setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      rescanQueued.current = false;
    };
  }, [refresh]);

  const providers = [snapshot.providers.claude, snapshot.providers.codex].filter(
    (provider): provider is ProviderStats => provider !== undefined,
  );
  const models = aggregateModels(
    providers.filter((provider) => provider.provider === "claude"),
    8,
  );
  const codex = snapshot.providers.codex;
  const accountCoverage = codex
    ? `account recorded for ${codex.attributedSessions.toLocaleString()} of ${codex.sessions.toLocaleString()} sessions${codex.firstAttributedSession ? ` (since ${dateLabel(codex.firstAttributedSession)})` : ""}`
    : "Account coverage unavailable";
  const actions = (
    <ActionPanel>
      <Action
        title={isShowingDetail ? "Hide Details" : "Show Details"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => setIsShowingDetail((shown) => !shown)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => void refresh()}
      />
      <Action
        title="Rescan Logs"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={() => void refresh(true)}
      />
    </ActionPanel>
  );

  function lifetimeRow(id: "claude" | "codex" | "both", title: string) {
    const selected = id === "both" ? providers : providers.filter((provider) => provider.provider === id);
    const summary = selected.length ? lifetimeSummary(selected) : null;
    const includesClaude = selected.some((provider) => provider.provider === "claude");
    const includesCodex = selected.some((provider) => provider.provider === "codex");
    const failed =
      refreshFailed ||
      (id === "both"
        ? Boolean(snapshot.errors.claude || snapshot.errors.codex || snapshot.errors.index)
        : Boolean(snapshot.errors[id] || (id === "codex" && snapshot.errors.index)));
    const partial = id === "both" && selected.length === 1;
    const errors = [
      ...new Set(
        (id === "both"
          ? [snapshot.errors.claude, snapshot.errors.codex, snapshot.errors.index]
          : [snapshot.errors[id], ...(id === "codex" ? [snapshot.errors.index] : [])]
        ).filter((error): error is string => Boolean(error)),
      ),
    ];
    return (
      <List.Item
        key={id}
        id={id}
        title={title}
        subtitle={summary ? (partial ? "Partial" : undefined) : "Unavailable"}
        icon={failed ? Icon.Warning : Icon.BarChart}
        accessories={
          summary
            ? [
                { text: `${compactNumber(summary.tokens.total)} tokens` },
                ...(includesClaude
                  ? [
                      {
                        text:
                          summary.totalCost === null
                            ? "Claude list-price estimate unavailable"
                            : `≈ ${money(summary.totalCost)} Claude list-price estimate`,
                      },
                    ]
                  : []),
                ...(id === "codex" && codex ? [{ text: `${codex.sessions} sessions` }] : []),
                ...(summary.firstDay ? [{ text: `since ${dateLabel(summary.firstDay)}` }] : []),
                ...(failed ? [{ text: "Cached" }] : []),
              ]
            : []
        }
        detail={
          <List.Item.Detail
            markdown={[
              summary ? null : "Usage statistics are unavailable. Refresh to try again.",
              failed && summary ? "Refresh failed. Showing cached statistics." : null,
              ...errors.map(markdownText),
              partial ? "One provider is unavailable. This total includes the available provider only." : null,
              includesClaude ? PRICE_NOTE : null,
              includesClaude ? "Claude totals come from CodexBar." : null,
              includesClaude ? CLAUDE_NOTE : null,
              includesCodex ? CODEX_NOTE : null,
            ]
              .filter(Boolean)
              .join("\n\n")}
            metadata={
              summary ? (
                <List.Item.Detail.Metadata>
                  {tokenMetadata(summary.tokens)}
                  {includesClaude ? (
                    <List.Item.Detail.Metadata.Label
                      title="Claude list-price estimate"
                      text={summary.totalCost === null ? "Unavailable" : `≈ ${money(summary.totalCost)}`}
                    />
                  ) : null}
                  <List.Item.Detail.Metadata.Separator />
                  {id === "codex" && codex ? (
                    <>
                      <List.Item.Detail.Metadata.Label title="Sessions" text={String(codex.sessions)} />
                      <List.Item.Detail.Metadata.Label title="First session" text={dateLabel(codex.firstSession)} />
                      <List.Item.Detail.Metadata.Label title="Last session" text={dateLabel(codex.lastSession)} />
                    </>
                  ) : (
                    <>
                      <List.Item.Detail.Metadata.Label title="Days active" text={String(summary.daysActive)} />
                      <List.Item.Detail.Metadata.Label title="First day" text={dateLabel(summary.firstDay)} />
                      <List.Item.Detail.Metadata.Label title="Last day" text={dateLabel(summary.lastDay)} />
                    </>
                  )}
                  {includesCodex && codex ? (
                    <List.Item.Detail.Metadata.Label
                      title="Forked sessions corrected"
                      text={String(codex.forkedSessions)}
                    />
                  ) : null}
                  <List.Item.Detail.Metadata.Label
                    title="Last 30 days tokens"
                    text={summary.last30DaysTokens === null ? "Unavailable" : compactNumber(summary.last30DaysTokens)}
                  />
                  {includesClaude ? (
                    <List.Item.Detail.Metadata.Label
                      title="Last 30 days Claude list-price estimate"
                      text={
                        summary.last30DaysCostUSD === null ? "Unavailable" : `≈ ${money(summary.last30DaysCostUSD)}`
                      }
                    />
                  ) : null}
                  <List.Item.Detail.Metadata.Label
                    title="History coverage"
                    text={summary.historyCoverageIsEstablished ? "Established" : "History is still being indexed"}
                  />
                  {selected.map((provider) => (
                    <List.Item.Detail.Metadata.Label
                      key={provider.provider}
                      title={`${PROVIDER_NAMES[provider.provider]} updated`}
                      text={provider.updatedAt ?? "Unavailable"}
                    />
                  ))}
                </List.Item.Detail.Metadata>
              ) : undefined
            }
          />
        }
        actions={actions}
      />
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search usage statistics">
      <List.Section title="Lifetime">
        {lifetimeRow("claude", "Claude Code")}
        {lifetimeRow("codex", "Codex")}
        {lifetimeRow("both", "Both")}
      </List.Section>
      <List.Section title="Codex by account" subtitle={accountCoverage}>
        {snapshot.accounts.map((account, index) => (
          <List.Item
            key={`${account.accountId ?? "unknown"}:${index}`}
            title={account.label}
            subtitle={`${account.sessions} sessions · ${compactNumber(account.tokens.total)} total · ${compactNumber(account.tokens.output)} output · ${dateLabel(account.firstSession)} to ${dateLabel(account.lastSession)}`}
            icon={Icon.Person}
            accessories={
              snapshot.errors.index ? [{ text: "Index incomplete" }] : refreshFailed ? [{ text: "Cached" }] : []
            }
            detail={
              <List.Item.Detail
                markdown={[
                  `## ${markdownText(account.label)}`,
                  snapshot.errors.index ? `Index incomplete. ${markdownText(snapshot.errors.index)}` : null,
                  refreshFailed ? "Refresh failed. Showing saved account statistics." : null,
                  CODEX_NOTE,
                ]
                  .filter(Boolean)
                  .join("\n\n")}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Sessions" text={String(account.sessions)} />
                    {tokenMetadata(account.tokens)}
                    <List.Item.Detail.Metadata.Label title="First session" text={dateLabel(account.firstSession)} />
                    <List.Item.Detail.Metadata.Label title="Last session" text={dateLabel(account.lastSession)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions}
          />
        ))}
        {snapshot.accounts.length === 0 ? (
          <List.Item
            title="Account statistics unavailable"
            subtitle={
              snapshot.errors.index ? "Log indexing failed. Refresh to try again." : "No indexed Codex sessions"
            }
            icon={Icon.Info}
            detail={
              <List.Item.Detail markdown="Account statistics are unavailable.\n\nClaude logs lack account attribution." />
            }
            actions={actions}
          />
        ) : null}
        <List.Item
          title="Claude Code: all accounts combined"
          subtitle="Logs do not record account identity"
          icon={Icon.Info}
          detail={<List.Item.Detail markdown={CLAUDE_NOTE} />}
          actions={actions}
        />
      </List.Section>
      <List.Section title="Top models" subtitle={MODEL_NOTE}>
        {models.map((model) => (
          <List.Item
            key={`${model.provider}:${model.modelName}`}
            title={model.modelName}
            subtitle={`${compactNumber(model.totalTokens)} tokens · ${model.cost === null ? "Claude list-price estimate unavailable" : `≈ ${money(model.cost)} Claude list-price estimate`}`}
            accessories={[{ tag: PROVIDER_NAMES[model.provider] }]}
            icon={Icon.BarChart}
            detail={
              <List.Item.Detail
                markdown={`## ${markdownText(model.modelName)}\n\n${PROVIDER_NAMES[model.provider]}\n\nTotal: ${compactNumber(model.totalTokens)} tokens\n\nClaude list-price estimate: ${model.cost === null ? "Unavailable" : `≈ ${money(model.cost)}`}\n\n${snapshot.errors[model.provider] || refreshFailed ? "Refresh failed. Showing cached statistics.\n\n" : ""}${PRICE_NOTE}`}
              />
            }
            actions={actions}
          />
        ))}
      </List.Section>
    </List>
  );
}
