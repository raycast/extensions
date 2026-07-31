import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, type Image, Keyboard } from "@raycast/api";
import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { AdminTokenError, fetchSnapshot, getPreferences, type ProviderInfo, type ProviderQuotaReport } from "./api";
import { providerLogo, usageRing } from "./branding";
import {
  bar,
  buildQuotaRows,
  formatCost,
  formatNumber,
  formatReset,
  formatResetAbsolute,
  formatTokens,
  maxUtilisation,
  paceColor,
  paceDescription,
  paceLabel,
  findPaceRow,
  providerShortTitle,
  providerTitle,
  selectQuotaRow,
  usageColor,
  type QuotaRow,
} from "./quota";
import type { PaceWindowChoice, WindowChoice } from "./api";

function providerIcon(report: ProviderQuotaReport, info?: ProviderInfo): Image.ImageLike {
  if (report.error) return { source: Icon.ExclamationMark, tintColor: Color.Red };
  const logo = providerLogo(report.provider);
  if (logo) return logo;
  if (info?.disabled) return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
  const worst = maxUtilisation(report.quota);
  if (worst < 0) return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
  return { source: Icon.Circle, tintColor: usageColor(worst) };
}

function quotaAccessories(rows: QuotaRow[], choice: WindowChoice, paceChoice: PaceWindowChoice): List.Item.Accessory[] {
  if (rows.length === 0) return [{ tag: { value: "no quota data", color: Color.SecondaryText } }];
  const row = selectQuotaRow(rows, choice);
  if (!row) return [{ tag: { value: "no quota data", color: Color.SecondaryText } }];
  const accessories: List.Item.Accessory[] = [];

  // Pace tracks its own configured window, independent of whichever window the ring shows.
  const paced = findPaceRow(rows, paceChoice);
  if (paced) {
    accessories.push({
      text: { value: paceLabel(paced.pace), color: paceColor(paced.pace) },
      tooltip: paceDescription(paced.row, paced.pace),
    });
  }

  // The window name lives in the tooltip; the row is too narrow to spend width on a label
  // that rarely changes.
  accessories.push({
    icon: usageRing(row.percent),
    text: { value: `${Math.round(row.percent)}%`, color: usageColor(row.percent) },
    tooltip: [row.label, formatResetAbsolute(row.resetAt)].filter(Boolean).join(" · "),
  });

  return accessories;
}

function detailMarkdown(report: ProviderQuotaReport, rows: QuotaRow[], paceChoice: PaceWindowChoice): string {
  // No heading: the selected row already names the provider, so a title just repeats it.
  const lines: string[] = [];
  if (report.error) {
    lines.push(`> ⚠️ ${report.error}`, "");
  }
  if (rows.length === 0) {
    lines.push("_No rate-limit windows reported for this provider._");
  } else {
    // One compact block for every window, with the weekly pace sentence underneath.
    lines.push("```text");
    for (const row of rows) {
      const label = row.label.padEnd(10, " ");
      const percent = `${Math.round(row.percent)}%`.padStart(4, " ");
      const reset = formatReset(row.resetAt);
      lines.push(`${label} ${bar(row.percent, 24)} ${percent}${reset ? `  ${reset}` : ""}`);
    }
    lines.push("```");

    const paced = findPaceRow(rows, paceChoice);
    if (paced) lines.push("", paceDescription(paced.row, paced.pace));
  }
  return lines.join("\n");
}

export default function ProviderUsageCommand() {
  const { usageRange, baseUrl, ringWindow, paceWindow } = getPreferences();
  // `revalidate()` replays the hook's original arguments, so a plain call would keep asking the
  // proxy for its cached quotas. This flag lets an explicit Refresh/Retry force an upstream re-poll
  // without changing the cache key.
  const forceNextFetch = useRef(false);
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      const refresh = forceNextFetch.current;
      const snapshot = await fetchSnapshot({ refresh });
      // Cleared only once fresh data is in hand. If the request is aborted (a newer revalidate
      // superseded it) or fails, the request the user asked for never landed, so the flag stays
      // set and the next attempt still forces an upstream re-poll.
      forceNextFetch.current = false;
      return snapshot;
    },
    [],
    { keepPreviousData: true, failureToastOptions: { title: "Cannot reach OpenCodex" } },
  );

  const forceRefresh = () => {
    forceNextFetch.current = true;
    revalidate();
  };

  const reports = data?.quotas.reports ?? [];
  const providerByName = new Map((data?.providers ?? []).map((provider) => [provider.name, provider]));
  const usageByProvider = new Map((data?.usage?.providers ?? []).map((entry) => [entry.provider, entry]));
  const defaultProvider = data?.config?.defaultProvider;

  const sorted = [...reports].sort((a, b) => maxUtilisation(b.quota) - maxUtilisation(a.quota));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={reports.length > 0}
      searchBarPlaceholder="Search providers…"
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={forceRefresh}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: error instanceof AdminTokenError ? Icon.Lock : Icon.Plug, tintColor: Color.Red }}
          title={error instanceof AdminTokenError ? "OpenCodex Rejected the Admin Token" : "Cannot reach OpenCodex"}
          description={
            error instanceof AdminTokenError
              ? `${error.message}\n\nReported by ${baseUrl}.`
              : `${error.message}\n\nChecked ${baseUrl}. Make sure the proxy is running.`
          }
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={forceRefresh}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : reports.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.Plug, tintColor: Color.SecondaryText }}
          title="No Providers Connected"
          description={`${baseUrl} reported no providers. Connect one in OpenCodex and refresh.`}
        />
      ) : (
        <List.Section title="Providers" subtitle={`${reports.length} connected`}>
          {sorted.map((report) => {
            const info = providerByName.get(report.provider);
            const rows = buildQuotaRows(report.quota);
            const paced = findPaceRow(rows, paceWindow);
            const usage = usageByProvider.get(report.provider);
            return (
              <List.Item
                key={report.provider}
                icon={providerIcon(report, info)}
                title={providerShortTitle(report)}
                accessories={quotaAccessories(rows, ringWindow, paceWindow)}
                detail={
                  <List.Item.Detail
                    markdown={detailMarkdown(report, rows, paceWindow)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Provider" text={providerTitle(report)} />
                        <List.Item.Detail.Metadata.Label title="Id" text={report.provider} />
                        {info?.adapter && <List.Item.Detail.Metadata.Label title="Adapter" text={info.adapter} />}
                        {info?.baseUrl && <List.Item.Detail.Metadata.Label title="Base URL" text={info.baseUrl} />}
                        <List.Item.Detail.Metadata.TagList title="Status">
                          {defaultProvider === report.provider && (
                            <List.Item.Detail.Metadata.TagList.Item text="Default" color={Color.Blue} />
                          )}
                          <List.Item.Detail.Metadata.TagList.Item
                            text={info?.disabled ? "Disabled" : "Active"}
                            color={info?.disabled ? Color.SecondaryText : Color.Green}
                          />
                          {info?.codexAccountMode && (
                            <List.Item.Detail.Metadata.TagList.Item text={info.codexAccountMode} color={Color.Purple} />
                          )}
                        </List.Item.Detail.Metadata.TagList>
                        {rows.map((row) => (
                          <List.Item.Detail.Metadata.Label
                            key={row.label}
                            title={row.label}
                            text={`${Math.round(row.percent)}%${
                              formatResetAbsolute(row.resetAt) ? ` · resets ${formatResetAbsolute(row.resetAt)}` : ""
                            }`}
                            icon={usageRing(row.percent)}
                          />
                        ))}
                        {paced && (
                          <List.Item.Detail.Metadata.Label
                            title={`${paced.row.label} pace`}
                            text={{ value: paceLabel(paced.pace), color: paceColor(paced.pace) }}
                          />
                        )}
                        {typeof report.quota?.resetCredits === "number" && (
                          <List.Item.Detail.Metadata.Label
                            title="Reset credits"
                            text={String(report.quota.resetCredits)}
                          />
                        )}
                        {usage && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label
                              title={`Requests (${usageRange})`}
                              text={formatNumber(usage.requests)}
                            />
                            <List.Item.Detail.Metadata.Label
                              title={`Tokens (${usageRange})`}
                              text={formatTokens(usage.totalTokens)}
                            />
                            {typeof usage.shareRatio === "number" && (
                              <List.Item.Detail.Metadata.Label
                                title="Traffic share"
                                text={`${Math.round(usage.shareRatio * 100)}%`}
                              />
                            )}
                            {typeof usage.estimatedCostUsd === "number" && (
                              <List.Item.Detail.Metadata.Label
                                title="Estimated cost"
                                text={formatCost(usage.estimatedCostUsd)}
                              />
                            )}
                          </>
                        )}
                        {report.source && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Quota source" text={report.source} />
                          </>
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={forceRefresh}
                    />
                    <Action.OpenInBrowser title="Open OpenCodex Dashboard" url={baseUrl} />
                    <Action.CopyToClipboard
                      title="Copy Quota Summary"
                      content={rows.map((row) => `${row.label}: ${Math.round(row.percent)}%`).join(", ")}
                    />
                    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
