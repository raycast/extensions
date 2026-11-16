import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Brand } from "../lib/brand";
import { Fragment } from "react";
import { useAreg } from "../lib/api";
import { FINANCIAL_GROUPS } from "../lib/financials";
import { formatChange, formatCompactNumber, formatDate, formatNumber } from "../lib/format";
import { getStrings, type Strings } from "../lib/strings";
import type { CompanySummary, FinancialsResponse, FinancialYear } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, ResourceEmptyView } from "./common";

function statementMarkdown(year: FinancialYear, previous: FinancialYear | undefined, t: Strings) {
  const n = (value: unknown) => (typeof value === "number" ? formatNumber(value) : "–");
  const parts = [
    `## ${t.financials} ${year.year}`,
    `${formatDate(year.periodStart)} – ${formatDate(year.periodEnd)} · _${t.amountsInThousands(year.currency ?? "NOK")}_`,
  ];
  for (const group of FINANCIAL_GROUPS) {
    const lines = group.lines.filter((line) => typeof year[line.key] === "number");
    if (!lines.length) continue;
    parts.push(
      [
        `### ${group.label}`,
        "",
        // One figure column plus the change keeps exact amounts from wrapping in the narrow detail pane.
        `| | ${year.year} | ${previous ? t.changeFrom(previous.year) : ""} |`,
        "| --- | ---: | ---: |",
        ...lines.map((line) => {
          const label = line.total ? `**${line.label}**` : line.label;
          const value = line.total ? `**${n(year[line.key])}**` : n(year[line.key]);
          const change = previous ? (formatChange(year[line.key], previous[line.key]) ?? "") : "";
          return `| ${label} | ${value} | ${change} |`;
        }),
      ].join("\n"),
    );
  }
  return parts.join("\n\n");
}

// Metadata rows keep long labels and exact amounts readable; a markdown table wraps both in the narrow pane.
function StatementDetail({ year, previous }: { year: FinancialYear; previous: FinancialYear | undefined }) {
  const t = getStrings();
  const M = List.Item.Detail.Metadata;
  const groups = FINANCIAL_GROUPS.map((group) => ({
    group,
    lines: group.lines.filter((line) => typeof year[line.key] === "number"),
  })).filter(({ lines }) => lines.length > 0);

  return (
    <List.Item.Detail
      metadata={
        <M>
          <M.Label
            title={`${t.financials} ${year.year}`}
            text={`${formatDate(year.periodStart)} – ${formatDate(year.periodEnd)}`}
          />
          <M.Label title={t.amountsInThousands(year.currency ?? "NOK")} text="" />
          {groups.map(({ group, lines }) => (
            <Fragment key={group.key}>
              <M.Separator />
              <M.Label title={group.label.toUpperCase()} text="" />
              {lines.map((line) => {
                const change = previous ? formatChange(year[line.key], previous[line.key]) : undefined;
                const value = formatNumber(year[line.key] as number);
                return (
                  <M.Label
                    key={line.key}
                    title={line.label}
                    text={{
                      value: change ? `${value} (${change})` : value,
                      color: line.total ? Color.PrimaryText : Color.SecondaryText,
                    }}
                  />
                );
              })}
            </Fragment>
          ))}
        </M>
      }
    />
  );
}

export function FinancialsView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const { data, isLoading, error, revalidate } = useAreg<FinancialsResponse>(`/${company.orgnr}/financials`);
  const years = [...(data?.years ?? [])].sort((a, b) => b.year - a.year);

  return (
    <List
      navigationTitle={`${t.financials} · ${company.name}`}
      isLoading={isLoading}
      isShowingDetail={years.length > 0}
      searchBarPlaceholder={t.year}
    >
      <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noFinancials} icon={Icon.BarChart} />
      {years.map((year, index) => {
        const previous = years[index + 1];
        const result = typeof year.netIncome === "number" ? year.netIncome : null;
        const pdf = data?.reportPdfs.find((report) => report.year === year.year);
        return (
          <List.Item
            key={year.year}
            icon={Icon.BarChart}
            title={String(year.year)}
            subtitle={
              typeof year.operatingRevenue === "number" ? formatCompactNumber(year.operatingRevenue * 1000) : undefined
            }
            accessories={
              result === null
                ? []
                : [
                    {
                      tag: {
                        value: formatCompactNumber(result * 1000),
                        color: result >= 0 ? Brand.up : Brand.down,
                      },
                      tooltip: t.netResult,
                    },
                  ]
            }
            detail={<StatementDetail year={year} previous={previous} />}
            actions={
              <CompanyActions
                company={company}
                context="detail"
                leading={
                  <>
                    <ActionPanel.Section title={`${t.financials} ${year.year}`}>
                      {pdf && <Action.OpenInBrowser title={t.openReport} icon={Icon.Document} url={pdf.url} />}
                      <Action.CopyToClipboard title={t.copyText} content={statementMarkdown(year, previous, t)} />
                    </ActionPanel.Section>
                  </>
                }
              >
                <PageActions company={company} page="financials" title={t.financials} onRefresh={revalidate} />
              </CompanyActions>
            }
          />
        );
      })}
    </List>
  );
}
