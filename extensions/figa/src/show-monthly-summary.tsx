// fallow-ignore-next-line unresolved-import
import { Action, ActionPanel, Detail, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { getMonthlyTotals, getWorkspaceContext } from "./api/client";
import { FIGA_DEVELOPER_API_DOCS_URL, getFigaApiKeySettingsUrl, getFigaExpensesUrl } from "./api/links";
import type { FigaMonthlyTotalItem, FigaMonthlyTotalsResponse, FigaWorkspaceContext } from "./api/types";
import { ReadCapabilityGate } from "./read-capability-gate";
import {
  canReadResource,
  escapeMarkdown,
  formatMoney,
  formatMonthLabel,
  getCenteredMonthRange,
  getCurrentMonth,
  getWorkspaceBaseCurrency,
} from "./format";

interface MonthlySummaryCommandData {
  context: FigaWorkspaceContext;
  summary?: FigaMonthlyTotalsResponse;
}

export default function Command() {
  const range = useMemo(() => getCenteredMonthRange(7), []);
  const state = usePromise(loadMonthlySummaryCommandData, [range.year, range.month, range.months]);

  return <MonthlySummaryView {...state} />;
}

function MonthlySummaryView({
  data,
  error,
  isLoading,
  revalidate,
}: {
  data?: MonthlySummaryCommandData;
  error?: unknown;
  isLoading: boolean;
  revalidate: () => void;
}) {
  return (
    <ReadCapabilityGate context={data?.context} error={error} onRetry={revalidate} resource="expenses">
      <MonthlySummaryDetail data={data} isLoading={isLoading} onRefresh={revalidate} />
    </ReadCapabilityGate>
  );
}

async function loadMonthlySummaryCommandData(
  startYear: number,
  startMonth: number,
  months: number,
): Promise<MonthlySummaryCommandData> {
  const context = await getWorkspaceContext();
  if (!canReadResource(context, "expenses")) return { context };

  const summary = await getMonthlyTotals({ startYear, startMonth, months });
  return { context, summary };
}

function MonthlySummaryActions({ data, onRefresh }: { data: MonthlySummaryCommandData; onRefresh: () => void }) {
  const current = getCurrentMonth();
  const currentTotal = findMonth(data.summary?.totals ?? [], current);
  const currency = getWorkspaceBaseCurrency(data.context);
  const currentSummary = currentTotal
    ? buildSingleMonthSummary(currentTotal, currency)
    : "No current-month total returned.";

  return (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy Current Month Summary"
        icon={Icon.CopyClipboard}
        content={currentSummary}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.CopyToClipboard
        title="Copy Summary Table"
        icon={Icon.CopyClipboard}
        content={buildPlainTextSummary(data)}
      />
      <Action.OpenInBrowser
        title="Open Current Month Expenses"
        icon={Icon.List}
        url={getFigaExpensesUrl(data.context.workspace.id, current)}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Open Developer API Docs" icon={Icon.Book} url={FIGA_DEVELOPER_API_DOCS_URL} />
    </ActionPanel>
  );
}

function MonthlySummaryDetail({
  data,
  isLoading,
  onRefresh,
}: {
  data?: MonthlySummaryCommandData;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Detail
      isLoading={isLoading}
      markdown={getMonthlySummaryMarkdown(data)}
      metadata={data ? <MonthlySummaryMetadata data={data} /> : undefined}
      actions={data ? <MonthlySummaryActions data={data} onRefresh={onRefresh} /> : undefined}
    />
  );
}

function getMonthlySummaryMarkdown(data?: MonthlySummaryCommandData): string {
  return data ? buildMonthlySummaryMarkdown(data) : "# Loading monthly summary";
}

function MonthlySummaryMetadata({ data }: { data: MonthlySummaryCommandData }) {
  const totals = data.summary?.totals ?? [];
  const currency = getWorkspaceBaseCurrency(data.context);
  const current = findMonth(totals, getCurrentMonth());
  const rangeLabel = buildRangeLabel(totals);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Workspace" icon={Icon.Building} text={data.context.workspace.name} />
      <Detail.Metadata.Label title="Base Currency" icon={Icon.Coins} text={currency} />
      <Detail.Metadata.Label title="Range" icon={Icon.Calendar} text={rangeLabel} />
      <CurrentMonthMetadata current={current} currency={currency} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link
        title="API Key Settings"
        text="Open in Figa"
        target={getFigaApiKeySettingsUrl(data.context.workspace.id)}
      />
    </Detail.Metadata>
  );
}

function CurrentMonthMetadata({ current, currency }: { current?: FigaMonthlyTotalItem; currency: string }) {
  if (!current) return null;

  return (
    <>
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Current Total"
        icon={Icon.Coins}
        text={formatMoney(current.totalAmount, currency)}
      />
      <Detail.Metadata.Label
        title="Current Paid"
        icon={Icon.CheckCircle}
        text={formatMoney(current.paidAmount, currency)}
      />
      <Detail.Metadata.Label
        title="Current Unpaid"
        icon={Icon.Circle}
        text={formatMoney(current.unpaidAmount, currency)}
      />
    </>
  );
}

function buildRangeLabel(totals: FigaMonthlyTotalItem[]): string {
  if (totals.length === 0) return "No range";
  return `${formatMonthLabel(totals[0])} - ${formatMonthLabel(totals[totals.length - 1])}`;
}

function buildMonthlySummaryMarkdown(data: MonthlySummaryCommandData): string {
  const totals = data.summary?.totals ?? [];
  const currency = getWorkspaceBaseCurrency(data.context);

  if (totals.length === 0) {
    return [
      `# ${escapeMarkdown(data.context.workspace.name)} Monthly Summary`,
      "",
      "No monthly totals were returned.",
    ].join("\n");
  }

  return [
    `# ${escapeMarkdown(data.context.workspace.name)} Monthly Summary`,
    "",
    "| Month | Total | Paid | Unpaid |",
    "| --- | ---: | ---: | ---: |",
    ...totals.map((item) =>
      [
        `| ${formatMonthLabel(item, "short")}`,
        formatMoney(item.totalAmount, currency),
        formatMoney(item.paidAmount, currency),
        `${formatMoney(item.unpaidAmount, currency)} |`,
      ].join(" | "),
    ),
  ].join("\n");
}

function buildPlainTextSummary(data: MonthlySummaryCommandData): string {
  const currency = getWorkspaceBaseCurrency(data.context);

  return (data.summary?.totals ?? []).map((item) => buildSingleMonthSummary(item, currency)).join("\n");
}

function buildSingleMonthSummary(item: FigaMonthlyTotalItem, currency: string): string {
  return `${formatMonthLabel(item)}: total ${formatMoney(item.totalAmount, currency)}, paid ${formatMoney(
    item.paidAmount,
    currency,
  )}, unpaid ${formatMoney(item.unpaidAmount, currency)}`;
}

function findMonth(
  totals: FigaMonthlyTotalItem[],
  input: { year: number; month: number },
): FigaMonthlyTotalItem | undefined {
  return totals.find((item) => item.year === input.year && item.month === input.month);
}
