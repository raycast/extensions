import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { useAreg } from "../lib/api";
import { formatNumber, formatPercent } from "../lib/format";
import { getLanguage, getStrings } from "../lib/i18n";
import type { CompanySummary, HoldingsResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, ResourceEmptyView } from "./common";
import { YearDropdown } from "./ShareholdersView";

export function HoldingsView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const locale = getLanguage();
  const [year, setYear] = useState<number>();
  const { data, isLoading, error, revalidate } = useAreg<HoldingsResponse>(
    `/${company.orgnr}/holdings${year ? `?year=${year}` : ""}`,
  );
  const rows = [...(data?.holdings ?? [])].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));

  return (
    <List
      navigationTitle={`${t.holdings} · ${company.name}`}
      isLoading={isLoading}
      searchBarPlaceholder={t.holdings}
      searchBarAccessory={
        <YearDropdown years={data?.years ?? []} value={year ?? data?.year ?? undefined} onChange={setYear} />
      }
    >
      <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noHoldings} icon={Icon.Coins} />
      <List.Section title={data?.year ? `${t.registerYear} ${data.year}` : t.holdings} subtitle={String(rows.length)}>
        {rows.map((holding, index) => (
          <List.Item
            key={`${holding.companyOrgnr}-${holding.shareClass ?? ""}-${index}`}
            icon={Icon.Building}
            title={holding.companyName}
            subtitle={holding.shareClass ?? undefined}
            keywords={[holding.companyOrgnr]}
            accessories={[
              { text: formatNumber(holding.shares, locale), tooltip: t.shares },
              { tag: formatPercent(holding.pct, locale), tooltip: t.ownership },
            ]}
            actions={
              <CompanyActions company={{ orgnr: holding.companyOrgnr, name: holding.companyName }}>
                <PageActions company={company} page="holdings" title={t.holdings} onRefresh={revalidate} />
              </CompanyActions>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
