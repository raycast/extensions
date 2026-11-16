import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { useAreg } from "../lib/api";
import { formatNumber, formatPercent } from "../lib/format";
import { getLanguage, getStrings } from "../lib/i18n";
import type { CompanySummary, ShareholdersResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, PersonActions, ResourceEmptyView } from "./common";

export function YearDropdown(props: { years: number[]; value?: number; onChange: (year: number) => void }) {
  const t = getStrings();
  if (props.years.length === 0) return null;
  return (
    <List.Dropdown
      tooltip={t.registerYear}
      value={String(props.value ?? props.years[props.years.length - 1])}
      onChange={(value) => props.onChange(Number(value))}
    >
      {[...props.years].reverse().map((year) => (
        <List.Dropdown.Item key={year} title={String(year)} value={String(year)} />
      ))}
    </List.Dropdown>
  );
}

export function ShareholdersView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const locale = getLanguage();
  const [year, setYear] = useState<number>();
  const query = new URLSearchParams({ limit: "1000", ...(year ? { year: String(year) } : {}) });
  const { data, isLoading, error, revalidate } = useAreg<ShareholdersResponse>(
    `/${company.orgnr}/shareholders?${query}`,
  );
  const rows = data?.shareholders ?? [];
  const pageActions = (
    <PageActions company={company} page="shareholders" title={t.shareholders} onRefresh={revalidate} />
  );

  return (
    <List
      navigationTitle={`${t.shareholders} · ${company.name}`}
      isLoading={isLoading}
      searchBarPlaceholder={t.shareholders}
      searchBarAccessory={
        <YearDropdown years={data?.years ?? []} value={year ?? data?.year ?? undefined} onChange={setYear} />
      }
    >
      <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noShareholders} icon={Icon.PieChart} />
      <List.Section
        title={data?.year ? `${t.registerYear} ${data.year}` : t.shareholders}
        subtitle={data && data.total > rows.length ? t.moreShareholders(rows.length, data.total) : undefined}
      >
        {rows.map((holder, index) => {
          const isCompany = Boolean(holder.orgnr);
          const accessories: List.Item.Accessory[] = [
            { text: formatNumber(holder.shares, locale), tooltip: t.shares },
            { tag: formatPercent(holder.pct, locale), tooltip: t.ownership },
          ];
          return (
            <List.Item
              key={`${holder.orgnr ?? holder.name}-${holder.birthYear ?? ""}-${holder.shareClass ?? ""}-${index}`}
              icon={isCompany ? Icon.Building : Icon.Person}
              title={holder.name}
              subtitle={[
                holder.birthYear ? `${t.born} ${holder.birthYear}` : undefined,
                // Foreign holders come without a postcode or city before the comma, e.g. ", OH 43240".
                holder.location?.replace(/^[\s,]+/, ""),
              ]
                .filter(Boolean)
                .join(" · ")}
              keywords={[holder.orgnr ?? "", holder.location ?? ""]}
              accessories={accessories}
              actions={
                isCompany ? (
                  <CompanyActions company={{ orgnr: holder.orgnr as string, name: holder.name }}>
                    {pageActions}
                  </CompanyActions>
                ) : (
                  <PersonActions name={holder.name} born={holder.birthYear}>
                    {pageActions}
                  </PersonActions>
                )
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
