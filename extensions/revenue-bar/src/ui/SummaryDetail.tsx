import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { ConvertedTotal } from "../core/fx";
import { Money, formatMoney, formatMoneyList } from "../core/money";
import { DateRange } from "../core/ranges";
import { CommonActions } from "./components";
import { formatDateTime, updatedLabel } from "./format";
import { SHORTCUTS } from "./shortcuts";

export type SummaryDetailProps = {
  title: string;
  range: DateRange;
  gross: Money[];
  net?: Money[];
  fees?: Money[];
  refunds: Money[];
  count: number;
  partial: boolean;
  fetchedAt: Date;
  converted?: {
    gross: ConvertedTotal;
    net?: ConvertedTotal;
    refunds: ConvertedTotal;
    ratesDate: string;
    stale: boolean;
  };
  fxError?: string;
  dashboardUrl?: string;
  dashboardTitle?: string;
  onRefresh?: () => void;
};

function convertedText(total: ConvertedTotal | undefined): string | undefined {
  if (!total) return undefined;
  const parts = [formatMoney(total.total), ...total.unconverted.map((m) => formatMoney(m))];
  return parts.join(" + ");
}

/** Push target for a KPI row: Detail with markdown and Detail.Metadata (gumroad, autumn, trustmrr). */
export function SummaryDetail(props: SummaryDetailProps) {
  const notes: string[] = [];
  if (props.partial) {
    notes.push("Some providers had more sales than Revenue Bar reads in one refresh, so these totals may be low.");
  }
  if (props.converted?.stale) {
    notes.push(`Exchange rates could not be refreshed. Using the last known rates from ${props.converted.ratesDate}.`);
  }
  if (props.fxError) {
    notes.push(`Exchange rates are unavailable (${props.fxError}), so totals are shown per currency.`);
  }
  const markdown = [
    `# ${props.title}`,
    `${props.range.label}: ${formatDateTime(props.range.start)} to ${formatDateTime(new Date(props.range.end.getTime() - 1))}`,
    ...notes.map((n) => `> ${n}`),
    props.net
      ? "Gross is what customers paid. Net is gross minus the fees the provider reports. Refunds are listed separately."
      : "Gross is what customers paid. Refunds are listed separately.",
  ].join("\n\n");

  return (
    <Detail
      navigationTitle={props.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Gross" text={formatMoneyList(props.gross)} />
          {props.converted ? (
            <Detail.Metadata.Label
              title={`Gross in ${props.converted.gross.total.currency}`}
              text={convertedText(props.converted.gross)}
            />
          ) : null}
          {props.net ? <Detail.Metadata.Label title="Net (after fees)" text={formatMoneyList(props.net)} /> : null}
          {props.converted?.net ? (
            <Detail.Metadata.Label
              title={`Net in ${props.converted.net.total.currency}`}
              text={convertedText(props.converted.net)}
            />
          ) : null}
          {props.fees ? <Detail.Metadata.Label title="Fees" text={formatMoneyList(props.fees)} /> : null}
          <Detail.Metadata.Label title="Refunds" text={formatMoneyList(props.refunds)} />
          <Detail.Metadata.Label title="Sales" text={String(props.count)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Range" text={props.range.label} />
          {props.converted?.ratesDate ? (
            <Detail.Metadata.Label title="Exchange Rates" text={`ECB reference, ${props.converted.ratesDate}`} />
          ) : null}
          <Detail.Metadata.Label title="Updated" text={updatedLabel(props.fetchedAt)} />
          {props.dashboardUrl ? (
            <Detail.Metadata.Link title="Dashboard" target={props.dashboardUrl} text={props.dashboardTitle ?? "Open"} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {props.dashboardUrl ? (
            <Action.OpenInBrowser
              title={`Open ${props.dashboardTitle ?? "Dashboard"}`}
              url={props.dashboardUrl}
              icon={Icon.Globe}
              shortcut={SHORTCUTS.openDashboard}
            />
          ) : null}
          <Action.CopyToClipboard title="Copy Gross" content={formatMoneyList(props.gross)} />
          <CommonActions onRefresh={props.onRefresh} />
        </ActionPanel>
      }
    />
  );
}
