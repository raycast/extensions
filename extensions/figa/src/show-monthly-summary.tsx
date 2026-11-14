// fallow-ignore-next-line unresolved-import
import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { getMonthlyTotals, getWorkspaceContext } from "./api/client";
import { FIGA_DEVELOPER_API_DOCS_URL, getFigaApiKeySettingsUrl, getFigaExpensesUrl } from "./api/links";
import type { FigaMonthlyTotalItem, FigaMonthlyTotalsResponse, FigaWorkspaceContext } from "./api/types";
import { buildSingleMonthSummary, buildShareableMonthSummary, monthlySummaryNotes } from "./monthly-summary";
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
  const currency = data.summary?.currency ?? getWorkspaceBaseCurrency(data.context);
  const currentSummary = currentTotal
    ? buildShareableMonthSummary(currentTotal, currency)
    : "No current-month total returned.";

  return (
    <ActionPanel>
      {currentTotal ? (
        <Action.CopyToClipboard
          title="Copy Month Summary with Figa Link"
          icon={Icon.CopyClipboard}
          content={currentSummary}
        />
      ) : null}
      <Action.CopyToClipboard
        title="Copy Summary Table"
        icon={Icon.CopyClipboard}
        content={buildPlainTextSummary(data)}
      />
      <Action.OpenInBrowser
        title="Open Current Month Expenses"
        icon={Icon.List}
        url={getFigaExpensesUrl(data.context.workspace.id, current)}
      />
      <Action.OpenInBrowser
        title="Open API Key Settings"
        icon={Icon.Key}
        url={getFigaApiKeySettingsUrl(data.context.workspace.id)}
      />
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
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
      actions={data ? <MonthlySummaryActions data={data} onRefresh={onRefresh} /> : undefined}
    />
  );
}

function getMonthlySummaryMarkdown(data?: MonthlySummaryCommandData): string {
  return data ? buildMonthlySummaryMarkdown(data) : "# Loading monthly summary";
}

function buildRangeLabel(totals: FigaMonthlyTotalItem[]): string {
  if (totals.length === 0) return "No range";
  return `${formatMonthLabel(totals[0])} - ${formatMonthLabel(totals[totals.length - 1])}`;
}

function buildMonthlySummaryMarkdown(data: MonthlySummaryCommandData): string {
  const totals = data.summary?.totals ?? [];
  const currency = data.summary?.currency ?? getWorkspaceBaseCurrency(data.context);

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
    `**${currency}** · ${buildRangeLabel(totals)}`,
    "",
    "| Month | Known total | Estimated | Paid | Confirmed unpaid |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...totals.map((item) =>
      [
        `| ${formatMonthLabel(item, "short")}`,
        formatMoney(item.totalAmount, currency),
        item.estimatedAmount === undefined ? "—" : formatMoney(item.estimatedAmount, currency),
        formatMoney(item.paidAmount, currency),
        `${formatMoney(item.unpaidAmount, currency)} |`,
      ].join(" | "),
    ),
    "",
    "Known totals include estimates. Confirmed unpaid excludes estimates and unknown amounts.",
    ...totals.flatMap((item) =>
      monthlySummaryNotes(item).map((note) => `- **${formatMonthLabel(item, "short")}**: ${note}`),
    ),
  ].join("\n");
}

function buildPlainTextSummary(data: MonthlySummaryCommandData): string {
  const currency = data.summary?.currency ?? getWorkspaceBaseCurrency(data.context);

  return (data.summary?.totals ?? []).map((item) => buildSingleMonthSummary(item, currency)).join("\n\n");
}

function findMonth(
  totals: FigaMonthlyTotalItem[],
  input: { year: number; month: number },
): FigaMonthlyTotalItem | undefined {
  return totals.find((item) => item.year === input.year && item.month === input.month);
}
