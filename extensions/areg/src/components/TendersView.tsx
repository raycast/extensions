import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Brand } from "../lib/brand";
import { useAreg } from "../lib/api";
import { formatCompactMoney, formatDate } from "../lib/format";
import { getLanguage, getStrings } from "../lib/i18n";
import type { CompanySummary, TendersResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, ResourceEmptyView } from "./common";

export function TendersView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const locale = getLanguage();
  const { data, isLoading, error, revalidate } = useAreg<TendersResponse>(`/${company.orgnr}/tenders`);
  const pageActions = <PageActions company={company} page="tenders" title={t.tenders} onRefresh={revalidate} />;
  const doffin = (url: string) => (
    <ActionPanel.Section>
      <Action.OpenInBrowser title={t.openOnDoffin} icon={Icon.Globe} url={url} />
    </ActionPanel.Section>
  );
  const won = data?.won ?? [];
  const bought = data?.bought ?? [];

  return (
    <List navigationTitle={`${t.tenders} · ${company.name}`} isLoading={isLoading} searchBarPlaceholder={t.tenders}>
      {won.length === 0 && bought.length === 0 && (
        <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noTenders} icon={Icon.Hammer} />
      )}
      <List.Section
        title={t.won}
        subtitle={data?.summary.wonValueNok ? formatCompactMoney(data.summary.wonValueNok, "NOK", locale) : undefined}
      >
        {won.map((tender, index) => (
          <List.Item
            key={`won-${tender.id}-${index}`}
            icon={Icon.Trophy}
            title={tender.lotTitle ?? tender.title}
            subtitle={tender.buyer?.name}
            keywords={[tender.id, tender.title]}
            accessories={[
              ...(tender.value ? [{ tag: formatCompactMoney(tender.value, tender.currency, locale) }] : []),
              { text: formatDate(tender.awardedOn ?? tender.publishedOn, locale) },
            ]}
            actions={
              tender.buyer?.orgnr ? (
                <CompanyActions company={{ orgnr: tender.buyer.orgnr, name: tender.buyer.name }}>
                  {doffin(tender.doffinUrl)}
                  {pageActions}
                </CompanyActions>
              ) : (
                <ActionPanel>
                  {doffin(tender.doffinUrl)}
                  {pageActions}
                </ActionPanel>
              )
            }
          />
        ))}
      </List.Section>
      <List.Section title={t.bought}>
        {bought.map((tender) => (
          <List.Item
            key={`bought-${tender.id}`}
            icon={Icon.Hammer}
            title={tender.title}
            subtitle={tender.kindLabel}
            keywords={[tender.id]}
            accessories={[
              ...(tender.open ? [{ tag: { value: t.openTender, color: Brand.accent } }] : []),
              ...(tender.estimatedValue
                ? [{ tag: formatCompactMoney(tender.estimatedValue, tender.currency, locale) }]
                : []),
              { text: formatDate(tender.publishedOn, locale) },
            ]}
            actions={
              <ActionPanel>
                {doffin(tender.doffinUrl)}
                {pageActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
