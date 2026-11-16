import { Detail, Icon, List } from "@raycast/api";
import { isNotFound } from "../lib/api";
import { companyAvatar } from "../lib/brand";
import { companyStatus, keyPeople, useCompanyOverview } from "../lib/company";
import { formatAddress, formatDate, formatMoney, formatNumber, websiteUrl, type Locale } from "../lib/format";
import { getLanguage, getStrings, type Strings } from "../lib/i18n";
import { formatOrgnr } from "../lib/orgnr";
import type { CompanyResponse, CompanySummary, FinancialsResponse, RolesResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";

type Overview = {
  company?: CompanyResponse;
  financials?: FinancialsResponse;
  roles?: RolesResponse;
};

const escape = (text: string) => text.replace(/([\\`*_[\]|<>#])/g, "\\$1");

function keyFiguresTable(financials: FinancialsResponse | undefined, t: Strings, locale: Locale, years = 3) {
  const rows = [...(financials?.years ?? [])].sort((a, b) => b.year - a.year).slice(0, years);
  if (!rows.length) return "";
  const currency = rows[0].currency ?? "NOK";
  const n = (value: unknown) => formatNumber(typeof value === "number" ? value : null, locale);
  // Metrics as rows and years as columns, so the table stays readable in Raycast's narrow markdown pane.
  const metrics: [string, string][] = [
    [t.revenue, "operatingRevenue"],
    [t.operatingResult, "operatingResult"],
    [t.netResult, "netIncome"],
    [t.totalAssets, "totalAssets"],
    [t.equity, "totalEquity"],
  ];
  return [
    `## ${t.keyFigures}`,
    "",
    `| | ${rows.map((row) => row.year).join(" | ")} |`,
    `| --- | ${rows.map(() => "---:").join(" | ")} |`,
    ...metrics.map(([title, key]) => `| ${title} | ${rows.map((row) => n(row[key])).join(" | ")} |`),
    "",
    `_${t.amountsInThousands(currency)}_`,
  ].join("\n");
}

export function companyMarkdown(summary: CompanySummary, overview: Overview, t: Strings, locale: Locale) {
  const data = overview.company?.data;
  const people = keyPeople(overview.roles);
  const parts = [`# ${escape(overview.company?.name ?? summary.name)}`];

  const activity = (data?.aktivitet ?? []).join(" ").trim();
  if (activity) parts.push(escape(activity));

  const figures = keyFiguresTable(overview.financials, t, locale);
  if (figures) parts.push(figures);

  if (people.board.length || people.ceo) {
    const lines = [`## ${t.roles}`, ""];
    if (people.ceo) lines.push(`- **${t.ceo}**: ${escape(people.ceo)}`);
    for (const role of people.board) {
      const name = role.person?.name ?? role.entity?.name;
      if (name) lines.push(`- **${role.label}**: ${escape(name)}`);
    }
    parts.push(lines.join("\n"));
  }

  const purpose = (data?.vedtektsfestetFormaal ?? []).join(" ").trim();
  if (purpose && purpose !== activity) parts.push(`## ${t.purpose}\n\n${escape(purpose)}`);

  const formerNames = data?.historiskeNavn ?? [];
  if (formerNames.length) {
    parts.push(
      `## ${t.formerNames}\n\n${formerNames
        .map((n) => `- ${escape(n.navn)}${n.tilDato ? ` (${formatDate(n.tilDato, locale)})` : ""}`)
        .join("\n")}`,
    );
  }

  return parts.join("\n\n");
}

type MetadataProps = { summary: CompanySummary; overview: Overview; variant?: "detail" | "list" };

export function CompanyMetadata({ summary, overview, variant = "detail" }: MetadataProps) {
  // List.Item.Detail.Metadata has the same parts as Detail.Metadata, so one layout serves both.
  const M = (variant === "list" ? List.Item.Detail.Metadata : Detail.Metadata) as typeof Detail.Metadata;
  const t = getStrings();
  const locale = getLanguage();
  const company = overview.company;
  const data = company?.data;
  const people = keyPeople(overview.roles);
  const address = formatAddress(data?.forretningsadresse ?? data?.beliggenhetsadresse);
  const postal = formatAddress(data?.postadresse);
  const site = websiteUrl(data?.hjemmeside);
  const latest = [...(overview.financials?.years ?? [])].sort((a, b) => b.year - a.year)[0];
  const thousands = (value: unknown) =>
    typeof value === "number" ? formatMoney(value * 1000, latest?.currency, locale) : undefined;

  return (
    <M>
      <M.Label
        title={t.orgnr}
        text={formatOrgnr(summary.orgnr)}
        // The avatar's dot sizes follow the org number, so it belongs next to it, and only once a company is open.
        icon={variant === "detail" ? companyAvatar(summary.orgnr) : undefined}
      />
      <M.Label
        title={t.form}
        text={data?.organisasjonsform?.beskrivelse ?? company?.orgForm ?? summary.form ?? undefined}
      />
      {company && (
        <M.TagList title={t.status}>
          {companyStatus(company, t).map((tag) => (
            <M.TagList.Item key={tag.label} text={tag.label} color={tag.color} />
          ))}
        </M.TagList>
      )}
      {data?.naeringskode1 && <M.Label title={t.industry} text={data.naeringskode1.beskrivelse} />}
      {data?.antallAnsatte !== undefined && (
        <M.Label title={t.employees} text={formatNumber(data.antallAnsatte, locale)} />
      )}
      {data?.stiftelsesdato && <M.Label title={t.founded} text={formatDate(data.stiftelsesdato, locale)} />}
      {address && <M.Label title={t.address} text={address} />}
      {postal && postal !== address && <M.Label title={t.postalAddress} text={postal} />}
      {site && <M.Link title={t.website} text={data?.hjemmeside ?? site} target={site} />}
      {data?.epostadresse && <M.Link title={t.email} text={data.epostadresse} target={`mailto:${data.epostadresse}`} />}
      {(data?.telefon || data?.mobil) && <M.Label title={t.phone} text={data?.telefon ?? data?.mobil} />}

      {(people.ceo || people.chair || people.auditor) && <M.Separator />}
      {people.ceo && <M.Label title={t.ceo} text={people.ceo} icon={Icon.Person} />}
      {people.chair && <M.Label title={t.chair} text={people.chair} icon={Icon.Person} />}
      {people.auditor && <M.Label title={t.auditor} text={people.auditor} />}
      {people.accountant && <M.Label title={t.accountant} text={people.accountant} />}

      {latest && <M.Separator />}
      {latest && <M.Label title={`${t.revenue} ${latest.year}`} text={thousands(latest.operatingRevenue)} />}
      {latest && <M.Label title={`${t.netResult} ${latest.year}`} text={thousands(latest.netIncome)} />}
      {data?.kapital?.belop !== undefined && (
        <M.Label title={t.capital} text={formatMoney(data.kapital.belop, data.kapital.valuta, locale)} />
      )}
      {data && <M.Label title={t.vatRegistered} text={data.registrertIMvaregisteret ? t.yes : t.no} />}
      {data?.erIKonsern && <M.Label title={t.inGroup} text={t.yes} />}
    </M>
  );
}

export function CompanyDetail({ company: summary }: { company: CompanySummary }) {
  const t = getStrings();
  const locale = getLanguage();
  const overview = useCompanyOverview(summary.orgnr);
  const data = overview.company.data;

  if (overview.company.error && isNotFound(overview.company.error)) {
    return (
      <Detail
        navigationTitle={summary.name}
        markdown={`# ${t.notFound}\n\n${t.notFoundHint(formatOrgnr(summary.orgnr))}`}
        actions={<CompanyActions company={summary} context="detail" />}
      />
    );
  }

  const resolved: CompanySummary = {
    ...summary,
    name: data?.name ?? summary.name,
    form: data?.orgForm ?? summary.form,
    city: data?.data.forretningsadresse?.poststed ?? summary.city,
  };
  const overviewData = { company: data, financials: overview.financials.data, roles: overview.roles.data };

  return (
    <Detail
      navigationTitle={resolved.name}
      isLoading={overview.isLoading}
      markdown={companyMarkdown(resolved, overviewData, t, locale)}
      metadata={<CompanyMetadata summary={resolved} overview={overviewData} />}
      actions={
        <CompanyActions
          company={resolved}
          context="detail"
          website={websiteUrl(data?.data.hjemmeside)}
          address={formatAddress(data?.data.forretningsadresse)}
          onRefresh={overview.revalidate}
        />
      }
    />
  );
}
