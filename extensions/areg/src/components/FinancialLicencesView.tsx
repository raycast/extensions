import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useAreg } from "../lib/api";
import { formatDate } from "../lib/format";
import { getLanguage, getStrings } from "../lib/i18n";
import type { CompanySummary, FinancialLicencesResponse } from "../lib/types";
import { CompanyActions } from "./CompanyActions";
import { PageActions, ResourceEmptyView } from "./common";

export function FinancialLicencesView({ company }: { company: CompanySummary }) {
  const t = getStrings();
  const locale = getLanguage();
  const { data, isLoading, error, revalidate } = useAreg<FinancialLicencesResponse>(`/${company.orgnr}/konsesjoner`);
  const pageActions = (
    <>
      {data?.finanstilsynetUrl && (
        <ActionPanel.Section>
          <Action.OpenInBrowser title={t.openFinanstilsynet} icon={Icon.Globe} url={data.finanstilsynetUrl} />
        </ActionPanel.Section>
      )}
      <PageActions company={company} page="konsesjoner" title={t.financialLicences} onRefresh={revalidate} />
    </>
  );
  const licences = data?.licences ?? [];
  const byName = licences.reduce<Record<string, typeof licences>>((groups, licence) => {
    (groups[licence.licenceName] ??= []).push(licence);
    return groups;
  }, {});

  return (
    <List navigationTitle={`${t.financialLicences} · ${company.name}`} isLoading={isLoading}>
      {licences.length === 0 && (data?.agents ?? []).length === 0 && (
        <ResourceEmptyView isLoading={isLoading} error={error} emptyTitle={t.noFinancialLicences} icon={Icon.Shield} />
      )}
      {Object.entries(byName).map(([name, group]) => (
        <List.Section key={name} title={name} subtitle={String(group.length)}>
          {group.map((licence, index) => (
            <List.Item
              key={`${licence.licenceCode}-${index}`}
              icon={Icon.Shield}
              title={licence.detail ?? licence.licenceName}
              subtitle={licence.ownerName ?? undefined}
              accessories={[
                ...(licence.providerType ? [{ tag: licence.providerType }] : []),
                { text: formatDate(licence.registeredOn, locale) },
              ]}
              actions={
                licence.ownerOrgnr ? (
                  <CompanyActions
                    company={{ orgnr: licence.ownerOrgnr, name: licence.ownerName ?? licence.ownerOrgnr }}
                  >
                    {pageActions}
                  </CompanyActions>
                ) : (
                  <ActionPanel>{pageActions}</ActionPanel>
                )
              }
            />
          ))}
        </List.Section>
      ))}
      <List.Section title={t.agents} subtitle={data?.agents.length ? String(data.agents.length) : undefined}>
        {(data?.agents ?? []).map((agent, index) => (
          <List.Item
            key={`agent-${agent.orgnr ?? agent.name}-${index}`}
            icon={Icon.Building}
            title={agent.name}
            subtitle={agent.licences.join(", ")}
            actions={
              agent.orgnr ? (
                <CompanyActions company={{ orgnr: agent.orgnr, name: agent.name }}>{pageActions}</CompanyActions>
              ) : (
                <ActionPanel>{pageActions}</ActionPanel>
              )
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
