import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Fragment } from "react";
import { useAreg } from "../lib/api";
import { FINANCIAL_GROUPS } from "../lib/financials";
import { formatChange, formatCompactNumber, formatDate, formatNumber, type Locale } from "../lib/format";
import { getLanguage, getStrings, type Strings } from "../lib/i18n";
import type { CompanySummary, FinancialsResponse, FinancialYear } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, ResourceEmptyView } from "./common";

function statementMarkdown(year: FinancialYear, previous: FinancialYear | undefined, t: Strings, locale: Locale) {
  const n = (value: unknown) => (typeof value === "number" ? formatNumber(value, locale) : "–");
  const parts = [
    `## ${t.financials} ${year.year}`,
    `${formatDate(year.periodStart, locale)} – ${formatDate(year.periodEnd, locale)} · _${t.amountsInThousands(year.currency ?? "NOK")}_`,
  ];
  for (const group of FINANCIAL_GROUPS) {
    const lines = group.lines.filter((line) => typeof year[line.key] === "number");
    if (!lines.length) continue;
    parts.push(
      [
        `### ${group[locale]}`,
        "",
        // One figure column plus the change keeps exact amounts from wrapping in the narrow detail pane.
        `| | ${year.year} | ${previous ? t.changeFrom(previous.year) : ""} |`,
        "| --- | ---: | ---: |",
        ...lines.map((line) => {
          const label = line.total ? `**${line[locale]}**` : line[locale];
          const value = line.total ? `**${n(year[line.key])}**` : n(year[line.key]);
          const change = previous ? (formatChange(year[line.key], previous[line.key], locale) ?? "") : "";
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
  const locale = getLanguage();
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
            text={`${formatDate(year.periodStart, locale)} – ${formatDate(year.periodEnd, locale)}`}
          />
          <M.Label title={t.amountsInThousands(year.currency ?? "NOK")} text="" />
          {groups.map(({ group, lines }) => (
            <Fragment key={group.key}>
              <M.Separator />
              <M.Label title={group[locale].toUpperCase()} text="" />
              {lines.map((line) => {
                const change = previous ? formatChange(year[line.key], previous[line.key], locale) : undefined;
                const value = formatNumber(year[line.key] as number, locale);
                return (
                  <M.Label
                    key={line.key}
                    title={line[locale]}
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
  const locale = getLanguage();
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
              typeof year.operatingRevenue === "number"
                ? formatCompactNumber(year.operatingRevenue * 1000, locale)
                : undefined
            }
            accessories={
              result === null
                ? []
                : [
                    {
                      tag: {
                        value: formatCompactNumber(result * 1000, locale),
                        color: result >= 0 ? Color.Green : Color.Red,
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
                      <Action.CopyToClipboard
                        title={t.copyText}
                        content={statementMarkdown(year, previous, t, locale)}
                      />
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
