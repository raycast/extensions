import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useAreg } from "../lib/api";
import { formatCompactMoney, formatDate, formatMoney } from "../lib/format";
import { getLanguage, getStrings } from "../lib/i18n";
import type { CompanySummary, GrantsResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, ResourceEmptyView } from "./common";

export function GrantsView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const locale = getLanguage();
  const { data, isLoading, error, revalidate } = useAreg<GrantsResponse>(`/${company.orgnr}/grants`);
  const grants = [...(data?.grants ?? [])].sort((a, b) => (b.decidedOn ?? "").localeCompare(a.decidedOn ?? ""));

  return (
    <List
      navigationTitle={`${t.grants} · ${company.name}`}
      isLoading={isLoading}
      isShowingDetail={grants.length > 0}
      searchBarPlaceholder={t.grants}
    >
      <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noGrants} icon={Icon.BankNote} />
      <List.Section
        title={t.grants}
        subtitle={data?.total.amountNok ? formatCompactMoney(data.total.amountNok, "NOK", locale) : undefined}
      >
        {grants.map((grant, index) => (
          <List.Item
            key={`${grant.source}-${grant.decidedOn}-${index}`}
            icon={Icon.BankNote}
            title={grant.grantor}
            subtitle={grant.scheme ?? undefined}
            keywords={[grant.sourceLabel, grant.title ?? "", grant.subscheme ?? ""]}
            accessories={[{ text: grant.year ? String(grant.year) : undefined }]}
            detail={
              <List.Item.Detail
                markdown={[`### ${grant.title ?? grant.scheme ?? grant.grantor}`, grant.summary ?? ""].join("\n\n")}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={t.source} text={grant.sourceLabel} />
                    <List.Item.Detail.Metadata.Label title={t.status} text={grant.statusLabel} />
                    {grant.amountNok !== null && (
                      <List.Item.Detail.Metadata.Label
                        title={t.value}
                        text={formatMoney(grant.amountNok, "NOK", locale)}
                      />
                    )}
                    {grant.instrument && (
                      <List.Item.Detail.Metadata.Label title={t.instrument} text={grant.instrument} />
                    )}
                    {grant.scheme && (
                      <List.Item.Detail.Metadata.Label
                        title={t.scheme}
                        text={[grant.scheme, grant.subscheme].filter(Boolean).join(" · ")}
                      />
                    )}
                    {grant.decidedOn && (
                      <List.Item.Detail.Metadata.Label
                        title={t.registered}
                        text={formatDate(grant.decidedOn, locale)}
                      />
                    )}
                    {grant.region && <List.Item.Detail.Metadata.Label title={t.region} text={grant.region} />}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <CompanyActions
                company={company}
                context="detail"
                leading={
                  <>
                    {grant.sourceUrl && (
                      <ActionPanel.Section>
                        <Action.OpenInBrowser title={grant.sourceLabel} url={grant.sourceUrl} />
                      </ActionPanel.Section>
                    )}
                  </>
                }
              >
                <PageActions company={company} page="grants" title={t.grants} onRefresh={revalidate} />
              </CompanyActions>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
